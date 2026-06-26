from __future__ import annotations

from flask import Blueprint, Response, jsonify, request, session

from coopgest.access import can_access_project, require_project_access, require_project_permission
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.realtime import broadcast_project_data, project_event_stream

bp = Blueprint("realtime", __name__)


@bp.route("/api/projects/<int:project_id>/chat", methods=["GET", "POST"])
@login_required
def api_project_chat(project_id):
    conn = get_db()
    if not can_access_project(conn, project_id):
        conn.close()
        return api_error("Acesso negado", 403, "FORBIDDEN")

    if request.method == "POST":
        permission_error = require_project_permission(conn, project_id, "membro")
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
            "INSERT INTO chat_messages (projeto_id, user_nome, texto) VALUES (?,?,?)",
            (project_id, user_nome, texto),
        )
        new_id = cursor.lastrowid
        conn.commit()

        row = conn.execute("SELECT * FROM chat_messages WHERE id=?", (new_id,)).fetchone()
        message_data = row_to_dict(row)
        broadcast_project_data(project_id, "chat_message", message_data)

        conn.close()
        return jsonify(message_data), 201

    rows = conn.execute(
        "SELECT * FROM chat_messages WHERE projeto_id=? ORDER BY criado_em ASC",
        (project_id,),
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])


@bp.route("/api/projects/<int:id>/events")
@login_required
def api_project_events(id):
    conn = get_db()
    access_error = require_project_access(conn, id)
    conn.close()
    if access_error:
        return access_error

    return Response(
        project_event_stream(id),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

