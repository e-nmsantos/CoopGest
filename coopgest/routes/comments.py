from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from coopgest.access import require_project_access, require_project_permission, require_row_project_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit, notify_in_app

bp = Blueprint("comments", __name__)


@bp.route("/api/projects/<int:projeto_id>/comments", methods=["GET", "POST"])
@login_required
def api_project_comments(projeto_id):
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
        texto = str(payload.get("texto", "")).strip() if payload else ""
        if not texto:
            conn.close()
            return api_error("Texto é obrigatório", 400, "VALIDATION_ERROR")
        user_nome = session.get("nome", session.get("username", "Utilizador"))
        cursor = conn.execute(
            "INSERT INTO comentarios (projeto_id, user_nome, texto) VALUES (?,?,?)",
            (projeto_id, user_nome, texto),
        )
        new_id = cursor.lastrowid
        log_audit(conn, "comentou", "comentario", new_id, texto[:140], projeto_id)

        proj_row = conn.execute("SELECT nome FROM projetos WHERE id=?", (projeto_id,)).fetchone()
        proj_nome = proj_row["nome"] if proj_row else f"Projeto {projeto_id}"
        membros = conn.execute(
            "SELECT u.username FROM projeto_membros pm JOIN utilizadores u ON pm.user_id=u.id WHERE pm.projeto_id=? AND u.username!=?",
            (projeto_id, session.get("username", "")),
        ).fetchall()
        for membro in membros:
            notify_in_app(
                conn,
                membro["username"],
                f"Novo comentário em {proj_nome}",
                f'{user_nome} comentou: "{texto[:100]}"',
                f"/projeto/{projeto_id}",
            )
        conn.commit()
        row = conn.execute("SELECT * FROM comentarios WHERE id=?", (new_id,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    rows = conn.execute(
        "SELECT * FROM comentarios WHERE projeto_id=? ORDER BY criado_em DESC", (projeto_id,)
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])


@bp.route("/api/comments/<int:id>", methods=["DELETE"])
@login_required
def api_comment_detail(id):
    conn = get_db()
    row, access_error = require_row_project_access(conn, "comentarios", id, "Comentário não encontrado")
    if access_error:
        conn.close()
        return access_error
    user_nome = session.get("nome", session.get("username", ""))
    papel = session.get("papel", "membro")
    if row["user_nome"] != user_nome and papel != "admin":
        conn.close()
        return api_error("Sem permissão", 403, "FORBIDDEN")
    log_audit(conn, "eliminado", "comentario", id, row["texto"][:140], row["projeto_id"])
    conn.execute("DELETE FROM comentarios WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Comentário eliminado"})

