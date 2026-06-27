from flask import Blueprint, jsonify, request

from coopgest.access import require_project_access, require_project_permission
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required


bp = Blueprint("methodkit", __name__)


@bp.route("/api/projects/<int:projeto_id>/methodkit", methods=["GET", "POST"])
@login_required
def api_project_methodkit(projeto_id):
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
        if not payload or not str(payload.get("card_id", "")).strip():
            conn.close()
            return api_error("card_id é obrigatório", 400, "VALIDATION_ERROR")

        card_id = str(payload["card_id"]).strip()
        nota = str(payload.get("nota") or "").strip()
        selecionado = int(bool(payload.get("selecionado", True)))

        conn.execute(
            """INSERT INTO methodkit_seleccoes (projeto_id, card_id, nota, selecionado)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(projeto_id, card_id) DO UPDATE SET
                   nota = excluded.nota,
                   selecionado = excluded.selecionado""",
            (projeto_id, card_id, nota, selecionado),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM methodkit_seleccoes WHERE projeto_id=? AND card_id=?",
            (projeto_id, card_id),
        ).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    rows = conn.execute(
        "SELECT * FROM methodkit_seleccoes WHERE projeto_id=? ORDER BY criado_em ASC",
        (projeto_id,),
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@bp.route("/api/projects/<int:projeto_id>/methodkit/<card_id>", methods=["DELETE"])
@login_required
def api_project_methodkit_card(projeto_id, card_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error

    permission_error = require_project_permission(conn, projeto_id, "membro")
    if permission_error:
        conn.close()
        return permission_error

    existing = conn.execute(
        "SELECT id FROM methodkit_seleccoes WHERE projeto_id=? AND card_id=?",
        (projeto_id, card_id),
    ).fetchone()
    if not existing:
        conn.close()
        return api_error("Seleção não encontrada", 404, "NOT_FOUND")

    conn.execute(
        "DELETE FROM methodkit_seleccoes WHERE projeto_id=? AND card_id=?",
        (projeto_id, card_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Seleção removida com sucesso"})
