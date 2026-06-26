from __future__ import annotations

from flask import Blueprint, jsonify, request

from coopgest.access import require_project_access, require_project_permission, require_row_project_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit

bp = Blueprint("risks", __name__)


@bp.route("/api/projects/<int:projeto_id>/risks", methods=["GET", "POST"])
@login_required
def api_project_risks(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error

    if request.method == "POST":
        permission_error = require_project_permission(conn, projeto_id, "membro")
        if permission_error:
            conn.close()
            return permission_error
        payload = request.get_json(silent=True)
        descricao = str(payload.get("descricao", "")).strip() if payload else ""
        if not descricao:
            conn.close()
            return api_error("Descrição é obrigatória", 400, "VALIDATION_ERROR")
        cursor = conn.execute(
            "INSERT INTO riscos (projeto_id, descricao, probabilidade, impacto, estado, mitigacao) VALUES (?,?,?,?,?,?)",
            (
                projeto_id,
                descricao,
                payload.get("probabilidade", "Médio"),
                payload.get("impacto", "Médio"),
                payload.get("estado", "Identificado"),
                payload.get("mitigacao", "") or "",
            ),
        )
        new_id = cursor.lastrowid
        log_audit(conn, "criado", "risco", new_id, descricao[:140], projeto_id)
        conn.commit()
        row = conn.execute("SELECT * FROM riscos WHERE id=?", (new_id,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    rows = conn.execute(
        "SELECT * FROM riscos WHERE projeto_id=? ORDER BY criado_em ASC", (projeto_id,)
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])


@bp.route("/api/risks/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_risk_detail(id):
    conn = get_db()
    row, access_error = require_row_project_access(conn, "riscos", id, "Risco não encontrado", "membro")
    if access_error:
        conn.close()
        return access_error

    if request.method == "DELETE":
        log_audit(conn, "eliminado", "risco", id, row["descricao"][:140], row["projeto_id"])
        conn.execute("DELETE FROM riscos WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Risco eliminado"})

    payload = request.get_json(silent=True) or {}
    updates = []
    for field in ["descricao", "probabilidade", "impacto", "estado", "mitigacao"]:
        if field in payload:
            updates.append((field, payload[field]))
    if updates:
        set_clause = ", ".join([f"{field}=?" for field, _ in updates])
        values = [value for _, value in updates] + [id]
        conn.execute(f"UPDATE riscos SET {set_clause} WHERE id=?", values)
        log_audit(conn, "atualizado", "risco", id, str({field: value for field, value in updates}), row["projeto_id"])
        conn.commit()
    updated = conn.execute("SELECT * FROM riscos WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(updated))

