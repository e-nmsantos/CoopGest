from __future__ import annotations

import uuid

from flask import Blueprint, jsonify, request

from coopgest.access import require_project_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("feedback", __name__)


@bp.route("/api/projects/<int:projeto_id>/feedback-token", methods=["POST"])
@login_required
def api_project_feedback_token(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error

    payload = request.get_json(silent=True) or {}
    titulo = str(payload.get("titulo", "Formulário de Feedback")).strip()
    token = uuid.uuid4().hex
    cursor = conn.execute(
        "INSERT INTO feedback_tokens (token, projeto_id, titulo, descricao) VALUES (?,?,?,?)",
        (token, projeto_id, titulo, payload.get("descricao", "") or ""),
    )
    new_id = cursor.lastrowid
    conn.commit()
    row = row_to_dict(conn.execute("SELECT * FROM feedback_tokens WHERE id=?", (new_id,)).fetchone())
    conn.close()
    return jsonify({**row, "link": f"/feedback/{token}"}), 201


@bp.route("/api/projects/<int:projeto_id>/feedbacks", methods=["GET"])
@login_required
def api_project_feedbacks(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error

    tokens = conn.execute("SELECT id FROM feedback_tokens WHERE projeto_id=?", (projeto_id,)).fetchall()
    token_ids = [token["id"] for token in tokens]
    if not token_ids:
        conn.close()
        return jsonify({"feedbacks": []})

    placeholders = ",".join("?" * len(token_ids))
    rows = [
        row_to_dict(row)
        for row in conn.execute(
            f"SELECT * FROM feedbacks WHERE token_id IN ({placeholders}) ORDER BY criado_em DESC",
            token_ids,
        ).fetchall()
    ]
    conn.close()
    return jsonify({"feedbacks": rows})


@bp.route("/api/feedback/<token>", methods=["GET", "POST"])
def api_feedback_public(token):
    conn = get_db()
    feedback_token = conn.execute(
        "SELECT * FROM feedback_tokens WHERE token=? AND ativo=1",
        (token,),
    ).fetchone()
    if not feedback_token:
        conn.close()
        return api_error("Formulário não encontrado ou inactivo", 404, "NOT_FOUND")

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        resposta = str(payload.get("resposta", "")).strip()
        if not resposta:
            conn.close()
            return api_error("Resposta obrigatória", 400, "VALIDATION_ERROR")

        avaliacao = int(payload.get("avaliacao", 3) or 3)
        avaliacao = max(1, min(5, avaliacao))
        cursor = conn.execute(
            "INSERT INTO feedbacks (token_id, nome_respondente, resposta, avaliacao) VALUES (?,?,?,?)",
            (feedback_token["id"], payload.get("nome", "Anónimo") or "Anónimo", resposta, avaliacao),
        )
        new_id = cursor.lastrowid
        conn.commit()
        row = row_to_dict(conn.execute("SELECT * FROM feedbacks WHERE id=?", (new_id,)).fetchone())
        conn.close()
        return jsonify(row), 201

    project = conn.execute("SELECT nome FROM projetos WHERE id=?", (feedback_token["projeto_id"],)).fetchone()
    conn.close()
    return jsonify({**row_to_dict(feedback_token), "projeto_nome": project["nome"] if project else ""})

