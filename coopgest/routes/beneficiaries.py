from __future__ import annotations

from flask import Blueprint, jsonify, request

from coopgest.access import require_project_access, require_project_permission, require_row_project_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("beneficiaries", __name__)


@bp.route("/api/projects/<int:projeto_id>/beneficiarios", methods=["GET", "POST"])
@login_required
def api_project_beneficiarios(projeto_id):
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
        nome = str(payload.get("nome", "")).strip() if payload else ""
        if not nome:
            conn.close()
            return api_error("Nome é obrigatório", 400, "VALIDATION_ERROR")
        cursor = conn.execute(
            "INSERT INTO beneficiarios (projeto_id, nome, tipo, numero, descricao) VALUES (?,?,?,?,?)",
            (
                projeto_id,
                nome,
                payload.get("tipo", "Individual"),
                int(payload.get("numero", 1) or 1),
                payload.get("descricao", "") or "",
            ),
        )
        new_id = cursor.lastrowid
        conn.commit()
        row = conn.execute("SELECT * FROM beneficiarios WHERE id=?", (new_id,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    rows = conn.execute(
        "SELECT * FROM beneficiarios WHERE projeto_id=? ORDER BY data_registo DESC", (projeto_id,)
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])


@bp.route("/api/beneficiarios/<int:id>", methods=["DELETE"])
@login_required
def api_beneficiario_detail(id):
    conn = get_db()
    row, access_error = require_row_project_access(conn, "beneficiarios", id, "Beneficiário não encontrado", "membro")
    if access_error:
        conn.close()
        return access_error
    conn.execute("DELETE FROM beneficiarios WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Beneficiário eliminado"})

