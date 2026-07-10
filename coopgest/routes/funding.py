from __future__ import annotations

from flask import Blueprint, jsonify, request

from coopgest.access import require_project_access, require_project_permission, require_row_project_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("funding", __name__)


@bp.route("/api/projects/<int:projeto_id>/funding", methods=["GET", "POST"])
@login_required
def api_project_funding(projeto_id):
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
        if not payload or not str(payload.get("nome", "")).strip():
            conn.close()
            return api_error("Nome é obrigatório", 400, "VALIDATION_ERROR")
        cursor = conn.execute(
            """INSERT INTO fontes_financiamento
               (projeto_id, nome, tipo, valor_aprovado, valor_executado, moeda, data_inicio, data_fim, referencia)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                projeto_id,
                payload["nome"].strip(),
                payload.get("tipo", "Fundo Europeu"),
                float(payload.get("valor_aprovado", 0) or 0),
                float(payload.get("valor_executado", 0) or 0),
                str(payload.get("moeda") or "USD").strip().upper()[:3],
                payload.get("data_inicio") or None,
                payload.get("data_fim") or None,
                payload.get("referencia", "") or "",
            ),
        )
        new_id = cursor.lastrowid
        conn.commit()
        row = conn.execute("SELECT * FROM fontes_financiamento WHERE id=?", (new_id,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    rows = conn.execute(
        "SELECT * FROM fontes_financiamento WHERE projeto_id=? ORDER BY criado_em ASC",
        (projeto_id,),
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])


@bp.route("/api/funding/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_funding_detail(id):
    conn = get_db()
    existing, access_error = require_row_project_access(
        conn,
        "fontes_financiamento",
        id,
        "Fonte não encontrada",
        "membro",
    )
    if access_error:
        conn.close()
        return access_error

    if request.method == "DELETE":
        conn.execute("DELETE FROM fontes_financiamento WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Fonte eliminada"})

    payload = request.get_json(silent=True) or {}
    fields = []
    values = []
    for column, key in [
        ("nome", "nome"),
        ("tipo", "tipo"),
        ("valor_aprovado", "valor_aprovado"),
        ("valor_executado", "valor_executado"),
        ("moeda", "moeda"),
        ("data_inicio", "data_inicio"),
        ("data_fim", "data_fim"),
        ("referencia", "referencia"),
    ]:
        if key in payload:
            fields.append(f"{column}=?")
            values.append(float(payload[key]) if column.startswith("valor") else str(payload[key]).strip().upper()[:3] if column == "moeda" else payload[key])
    if not fields:
        conn.close()
        return api_error("Nada para atualizar", 400, "BAD_REQUEST")

    values.append(id)
    conn.execute(f'UPDATE fontes_financiamento SET {", ".join(fields)} WHERE id=?', values)
    conn.commit()
    row = conn.execute("SELECT * FROM fontes_financiamento WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))

