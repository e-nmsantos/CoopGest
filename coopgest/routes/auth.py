from __future__ import annotations

import os
import sqlite3
import uuid
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required, make_rate_limit

bp = Blueprint("auth", __name__)


def _rate_limit(limit_string: str):
    """Rate-limit decorator.  Resolves the Limiter lazily (no app context at
    import time) and caches the limited wrapper after the first request.
    Automatically exempts requests when the app is in TESTING mode so that
    the test suite is never throttled."""
    from functools import wraps

    def decorator(f):
        _cache: dict = {}

        @wraps(f)
        def wrapped(*args, **kwargs):
            # Skip rate limiting entirely in test mode
            if current_app.config.get("TESTING"):
                return f(*args, **kwargs)
            if "limited" not in _cache:
                # Flask-Limiter >=4 stores Limiter objects in a set
                limiter_set = current_app.extensions.get("limiter")
                if limiter_set:
                    obj = (
                        next(iter(limiter_set))
                        if isinstance(limiter_set, set)
                        else limiter_set
                    )
                    _cache["limited"] = obj.limit(limit_string)(f)
                else:
                    _cache["limited"] = f
            return _cache["limited"](*args, **kwargs)
        return wrapped
    return decorator


def _is_dev_token_response_enabled() -> bool:
    return current_app.config.get("TESTING") or (
        os.environ.get("FLASK_ENV", "development") != "production"
        and os.environ.get("ALLOW_DEV_RESET_TOKEN") == "1"
    )


@bp.route("/api/auth/login", methods=["POST"])
@_rate_limit("10 per minute")
def api_auth_login():
    payload = request.get_json(silent=True)
    if not payload or not payload.get("username") or not payload.get("password"):
        return api_error("Username e password são obrigatórios", 400, "VALIDATION_ERROR")

    conn = get_db()
    user = conn.execute(
        "SELECT * FROM utilizadores WHERE username=?", (payload["username"].strip(),)
    ).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], payload["password"]):
        return api_error("Credenciais inválidas", 401, "UNAUTHORIZED")

    session.clear()
    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["nome"] = user["nome"]
    session["papel"] = user["papel"]
    session.permanent = True
    return jsonify({
        "id": user["id"],
        "username": user["username"],
        "nome": user["nome"],
        "papel": user["papel"],
    })


@bp.route("/api/auth/logout", methods=["POST"])
def api_auth_logout():
    session.clear()
    return jsonify({"message": "Sessão terminada com sucesso"})


@bp.route("/api/auth/me")
def api_auth_me():
    if "user_id" not in session:
        return api_error("Não autenticado", 401, "UNAUTHORIZED")
    return jsonify({
        "id": session["user_id"],
        "username": session["username"],
        "nome": session["nome"],
        "papel": session["papel"],
    })


@bp.route("/api/auth/me", methods=["PATCH"])
@login_required
def api_auth_me_update():
    payload = request.get_json(silent=True) or {}
    user_id = session["user_id"]
    conn = get_db()
    user = conn.execute("SELECT * FROM utilizadores WHERE id=?", (user_id,)).fetchone()
    if not user:
        conn.close()
        return api_error("Utilizador não encontrado", 404, "NOT_FOUND")

    updates = []
    params = []

    novo_nome = str(payload.get("nome", "")).strip()
    if novo_nome:
        updates.append("nome=?")
        params.append(novo_nome)

    nova_password = payload.get("password", "")
    password_atual = payload.get("password_atual", "")
    if nova_password:
        if len(nova_password) < 8:
            conn.close()
            return api_error("A nova password deve ter pelo menos 8 caracteres", 400, "VALIDATION_ERROR")
        if not password_atual:
            conn.close()
            return api_error("Password atual é obrigatória para alterar a password", 400, "VALIDATION_ERROR")
        if not check_password_hash(user["password_hash"], password_atual):
            conn.close()
            return api_error("Password atual incorreta", 401, "UNAUTHORIZED")
        updates.append("password_hash=?")
        params.append(generate_password_hash(nova_password))

    if not updates:
        conn.close()
        return api_error("Nenhum campo para atualizar", 400, "VALIDATION_ERROR")

    params.append(user_id)
    conn.execute(f"UPDATE utilizadores SET {', '.join(updates)} WHERE id=?", params)
    conn.commit()
    if novo_nome:
        session["nome"] = novo_nome

    updated = conn.execute(
        "SELECT id, username, nome, papel FROM utilizadores WHERE id=?", (user_id,)
    ).fetchone()
    conn.close()
    return jsonify(row_to_dict(updated))


@bp.route("/api/auth/forgot-password", methods=["POST"])
@_rate_limit("10 per minute")
def api_auth_forgot_password():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    if not username:
        return api_error("Username é obrigatório", 400, "VALIDATION_ERROR")

    conn = get_db()
    user = conn.execute("SELECT * FROM utilizadores WHERE username=?", (username,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"message": "Se o utilizador existir, será enviado um email com instruções."})

    token = uuid.uuid4().hex
    expires_at = (datetime.now() + timedelta(hours=1)).isoformat(timespec="seconds")
    conn.execute(
        "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?,?,?)",
        (user["id"], token, expires_at),
    )
    conn.commit()
    conn.close()

    response = {"message": "Se o utilizador existir, será enviado um email com instruções."}
    if _is_dev_token_response_enabled():
        response["token"] = token
    return jsonify(response)


@bp.route("/api/auth/reset-password", methods=["POST"])
def api_auth_reset_password():
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", "")).strip()
    nova_password = str(payload.get("password", "")).strip()

    if not token or not nova_password:
        return api_error("Token e nova password são obrigatórios", 400, "VALIDATION_ERROR")
    if len(nova_password) < 8:
        return api_error("A password deve ter pelo menos 8 caracteres", 400, "VALIDATION_ERROR")

    conn = get_db()
    reset = conn.execute(
        "SELECT * FROM password_reset_tokens WHERE token=? AND usado=0", (token,)
    ).fetchone()
    if not reset:
        conn.close()
        return api_error("Token inválido ou já utilizado", 400, "INVALID_TOKEN")

    if datetime.fromisoformat(reset["expires_at"]) < datetime.now():
        conn.close()
        return api_error("Token expirado", 400, "TOKEN_EXPIRED")

    conn.execute(
        "UPDATE utilizadores SET password_hash=? WHERE id=?",
        (generate_password_hash(nova_password), reset["user_id"]),
    )
    conn.execute("UPDATE password_reset_tokens SET usado=1 WHERE id=?", (reset["id"],))
    conn.commit()
    conn.close()
    return jsonify({"message": "Password redefinida com sucesso."})


@bp.route("/api/auth/users", methods=["GET", "POST"])
@login_required
def api_auth_users():
    if session.get("papel") != "admin":
        return api_error("Acesso reservado a administradores", 403, "FORBIDDEN")

    if request.method == "POST":
        payload = request.get_json(silent=True)
        if not payload or not payload.get("username") or not payload.get("password") or not payload.get("nome"):
            return api_error("username, password e nome são obrigatórios", 400, "VALIDATION_ERROR")
        conn = get_db()
        try:
            conn.execute(
                "INSERT INTO utilizadores (username, password_hash, nome, papel) VALUES (?,?,?,?)",
                (
                    payload["username"].strip(),
                    generate_password_hash(payload["password"]),
                    payload["nome"].strip(),
                    payload.get("papel", "membro"),
                ),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return api_error("Username já existe", 409, "CONFLICT")
        conn.close()
        return jsonify({"message": "Utilizador criado com sucesso"}), 201

    conn = get_db()
    users = [
        {"id": r["id"], "username": r["username"], "nome": r["nome"], "papel": r["papel"]}
        for r in conn.execute("SELECT id, username, nome, papel FROM utilizadores ORDER BY nome").fetchall()
    ]
    conn.close()
    return jsonify(users)


@bp.route("/api/auth/invite", methods=["POST"])
@login_required
def api_auth_invite():
    if session.get("papel") != "admin":
        return api_error("Apenas administradores podem convidar", 403, "FORBIDDEN")
    payload = request.get_json(silent=True) or {}
    email = str(payload.get("email", "")).strip()
    papel = payload.get("papel", "membro")
    if papel not in {"admin", "membro", "gestor", "visualizador"}:
        papel = "membro"
    if not email:
        return api_error("Email é obrigatório", 400, "VALIDATION_ERROR")

    token = uuid.uuid4().hex
    conn = get_db()
    conn.execute(
        "INSERT INTO convites (email, token, papel, criado_por) VALUES (?,?,?,?)",
        (email, token, papel, session["user_id"]),
    )
    conn.commit()
    conn.close()
    host = request.host_url.rstrip("/")
    link = f"{host}/registo?token={token}"
    return jsonify({"token": token, "link": link, "email": email}), 201


@bp.route("/api/auth/invites")
@login_required
def api_auth_invites():
    if session.get("papel") != "admin":
        return api_error("Acesso reservado a administradores", 403, "FORBIDDEN")
    conn = get_db()
    rows = conn.execute("SELECT * FROM convites ORDER BY criado_em DESC LIMIT 100").fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@bp.route("/api/auth/invite/<token>")
def api_auth_invite_check(token):
    conn = get_db()
    convite = conn.execute("SELECT * FROM convites WHERE token=?", (token,)).fetchone()
    conn.close()
    if not convite or convite["usado"]:
        return jsonify({"valid": False}), 404
    return jsonify({"valid": True, "email": convite["email"], "papel": convite["papel"]})


@bp.route("/api/auth/register", methods=["POST"])
def api_auth_register():
    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", "")).strip()
    nome = str(payload.get("nome", "")).strip()
    password = str(payload.get("password", "")).strip()
    username = str(payload.get("username", "")).strip()
    if not all([token, nome, password, username]):
        return api_error("Dados obrigatórios em falta", 400, "VALIDATION_ERROR")

    conn = get_db()
    convite = conn.execute("SELECT * FROM convites WHERE token=? AND usado=0", (token,)).fetchone()
    if not convite:
        conn.close()
        return api_error("Convite inválido", 400, "INVALID_TOKEN")
    try:
        conn.execute(
            "INSERT INTO utilizadores (username, password_hash, nome, papel) VALUES (?,?,?,?)",
            (username, generate_password_hash(password), nome, convite["papel"]),
        )
    except sqlite3.IntegrityError:
        conn.close()
        return api_error("Username já existe", 409, "CONFLICT")
    conn.execute(
        "UPDATE convites SET usado=1, usado_em=? WHERE token=?",
        (datetime.now().isoformat(timespec="seconds"), token),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Conta criada com sucesso"}), 201

