from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from coopgest.access import require_project_permission, require_row_project_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit

bp = Blueprint("budget", __name__)

_TIPOS = ("Receita", "Despesa")


@bp.route("/api/projects/<int:projeto_id>/budget", methods=["POST"])
@login_required
def api_project_budget(projeto_id):
    conn = get_db()
    access_error = require_project_permission(conn, projeto_id, "membro")
    if access_error:
        conn.close()
        return access_error

    payload = request.get_json(silent=True)
    if not payload:
        conn.close()
        return api_error("Payload inválido", 400, "BAD_REQUEST")

    tipo = str(payload.get("tipo") or "Despesa")
    if tipo not in _TIPOS:
        tipo = "Despesa"

    cursor = conn.execute(
        "INSERT INTO orcamento (projeto_id, tipo, categoria, descricao, valor_previsto, valor_real) VALUES (?,?,?,?,?,?)",
        (
            projeto_id,
            tipo,
            payload.get("categoria", "") or "",
            payload.get("descricao", "") or "",
            float(payload.get("valor_previsto", 0) or 0),
            float(payload.get("valor_real", 0) or 0),
        ),
    )
    new_id = cursor.lastrowid
    log_audit(conn, "criado", "orcamento", new_id, payload.get("categoria", "") or tipo, projeto_id)
    conn.commit()
    row = conn.execute("SELECT * FROM orcamento WHERE id=?", (new_id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)), 201


@bp.route("/api/budget/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_budget_detail(id):
    conn = get_db()
    existing, access_error = require_row_project_access(conn, "orcamento", id, "Item de orçamento não encontrado", "membro")
    if access_error:
        conn.close()
        return access_error

    if request.method == "DELETE":
        log_audit(conn, "eliminado", "orcamento", id, existing["categoria"], existing["projeto_id"])
        conn.execute("DELETE FROM orcamento WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Item eliminado com sucesso"})

    payload = request.get_json(silent=True) or {}
    fields = []
    if "tipo" in payload:
        tipo = str(payload["tipo"])
        fields.append(("tipo", tipo if tipo in _TIPOS else "Despesa"))
    for field in ["categoria", "descricao"]:
        if field in payload:
            fields.append((field, str(payload[field] or "")))
    for field in ["valor_previsto", "valor_real"]:
        if field in payload:
            fields.append((field, float(payload[field] or 0)))

    if not fields:
        conn.close()
        return api_error("Nenhum campo para atualizar", 400, "VALIDATION_ERROR")

    # Record revision history for financial fields
    utilizador = session.get("nome", session.get("username", ""))
    for field, new_val in fields:
        old_val = existing[field]
        if str(old_val) != str(new_val):
            conn.execute(
                "INSERT INTO orcamento_revisoes (orcamento_id, projeto_id, campo, valor_anterior, valor_novo, alterado_por) VALUES (?,?,?,?,?,?)",
                (id, existing["projeto_id"], field, str(old_val), str(new_val), utilizador),
            )

    set_clause = ", ".join([f"{f}=?" for f, _ in fields])
    values = [v for _, v in fields] + [id]
    conn.execute(f"UPDATE orcamento SET {set_clause} WHERE id=?", values)
    log_audit(conn, "atualizado", "orcamento", id, str({f: v for f, v in fields}), existing["projeto_id"])
    conn.commit()
    updated = conn.execute("SELECT * FROM orcamento WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(updated))


@bp.route("/api/budget/<int:id>/history", methods=["GET"])
@login_required
def api_budget_history(id):
    conn = get_db()
    existing, access_error = require_row_project_access(conn, "orcamento", id, "Item de orçamento não encontrado", "leitor")
    if access_error:
        conn.close()
        return access_error
    rows = conn.execute(
        "SELECT * FROM orcamento_revisoes WHERE orcamento_id=? ORDER BY criado_em ASC", (id,)
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])
