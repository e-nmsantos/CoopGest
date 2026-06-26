from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("partners", __name__)


def _log_audit(conn, acao, entidade, entidade_id=None, detalhes="", projeto_id=None):
    user_nome = session.get("nome", session.get("username", "Sistema"))
    try:
        conn.execute(
            "INSERT INTO auditoria (user_nome, acao, entidade, entidade_id, projeto_id, detalhes) VALUES (?,?,?,?,?,?)",
            (user_nome, acao, entidade, entidade_id, projeto_id, str(detalhes)),
        )
    except Exception:
        pass


def _partner_to_dict(row):
    d = row_to_dict(row)
    if not d:
        return None
    return {
        "id": str(d["id"]),
        "name": d.get("nome", ""),
        "type": d.get("tipo", ""),
        "country": d.get("pais", "Portugal"),
        "contactPerson": d.get("contacto", ""),
        "email": d.get("email", ""),
        "phone": d.get("telefone", ""),
        "contribution": d.get("descricao", ""),
        "role": d.get("papel", ""),
    }


@bp.route("/api/partners", methods=["GET", "POST"])
@login_required
def api_partners():
    if request.method == "POST":
        payload = request.get_json(silent=True)
        if not payload or not str(payload.get("name", "")).strip():
            return api_error("Nome é obrigatório", 400, "VALIDATION_ERROR", {"name": "Campo obrigatório"})

        conn = get_db()
        cursor = conn.execute(
            "INSERT INTO parceiros (nome, tipo, pais, contacto, email, telefone, descricao, papel) VALUES (?,?,?,?,?,?,?,?)",
            (
                payload["name"].strip(),
                payload.get("type", "Cooperativa"),
                payload.get("country", "Portugal"),
                payload.get("contactPerson", ""),
                payload.get("email", ""),
                payload.get("phone", ""),
                payload.get("contribution", ""),
                payload.get("role", ""),
            ),
        )
        new_id = cursor.lastrowid
        _log_audit(conn, "criado", "parceiro", new_id, payload["name"].strip())
        conn.commit()
        row = conn.execute("SELECT * FROM parceiros WHERE id=?", (new_id,)).fetchone()
        conn.close()
        return jsonify(_partner_to_dict(row)), 201

    conn = get_db()
    page = request.args.get("page", type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 200)
    search = request.args.get("q", "").strip()

    if search:
        like = f"%{search}%"
        if page is not None:
            total = conn.execute("SELECT COUNT(*) FROM parceiros WHERE nome LIKE ?", (like,)).fetchone()[0]
            offset = (page - 1) * per_page
            rows = conn.execute(
                "SELECT * FROM parceiros WHERE nome LIKE ? ORDER BY nome ASC LIMIT ? OFFSET ?",
                (like, per_page, offset),
            ).fetchall()
            conn.close()
            return jsonify({
                "items": [_partner_to_dict(r) for r in rows],
                "total": total,
                "page": page,
                "per_page": per_page,
                "pages": -(-total // per_page),
            })
        rows = conn.execute("SELECT * FROM parceiros WHERE nome LIKE ? ORDER BY nome ASC", (like,)).fetchall()
    else:
        if page is not None:
            total = conn.execute("SELECT COUNT(*) FROM parceiros").fetchone()[0]
            offset = (page - 1) * per_page
            rows = conn.execute(
                "SELECT * FROM parceiros ORDER BY nome ASC LIMIT ? OFFSET ?",
                (per_page, offset),
            ).fetchall()
            conn.close()
            return jsonify({
                "items": [_partner_to_dict(r) for r in rows],
                "total": total,
                "page": page,
                "per_page": per_page,
                "pages": -(-total // per_page),
            })
        rows = conn.execute("SELECT * FROM parceiros ORDER BY nome ASC").fetchall()

    conn.close()
    return jsonify([_partner_to_dict(r) for r in rows])


@bp.route("/api/partners/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_partner_detail(id):
    conn = get_db()
    existing = conn.execute("SELECT id FROM parceiros WHERE id=?", (id,)).fetchone()
    if not existing:
        conn.close()
        return api_error("Parceiro não encontrado", 404, "NOT_FOUND")

    if request.method == "DELETE":
        conn.execute("DELETE FROM parceiros WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Parceiro eliminado com sucesso"})

    payload = request.get_json(silent=True)
    if not payload:
        conn.close()
        return api_error("Payload inválido", 400, "BAD_REQUEST")

    fields = [
        ("nome", str(payload["name"]).strip() if payload.get("name") else None),
        ("tipo", payload.get("type")),
        ("pais", payload.get("country")),
        ("contacto", payload.get("contactPerson")),
        ("email", payload.get("email")),
        ("telefone", payload.get("phone")),
        ("descricao", payload.get("contribution")),
        ("papel", payload.get("role")),
    ]
    updates = [(field, value) for field, value in fields if value is not None]
    if not updates:
        conn.close()
        return api_error("Nenhum campo para atualizar", 400, "VALIDATION_ERROR")

    set_clause = ", ".join([f"{field}=?" for field, _ in updates])
    values = [value for _, value in updates] + [id]
    conn.execute(f"UPDATE parceiros SET {set_clause} WHERE id=?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM parceiros WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(_partner_to_dict(row))

