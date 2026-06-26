from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from coopgest.access import require_project_permission, require_subtask_access, require_task_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("task_details", __name__)


@bp.route("/api/tasks/<int:task_id>/subtasks", methods=["GET", "POST"])
@login_required
def api_task_subtasks(task_id):
    conn = get_db()
    task, access_error = require_task_access(conn, task_id)
    if access_error:
        conn.close()
        return access_error
    if request.method == "POST":
        permission_error = require_project_permission(conn, task["projeto_id"], "membro")
        if permission_error:
            conn.close()
            return permission_error
        payload = request.get_json(silent=True) or {}
        nome = str(payload.get("nome", "")).strip()
        if not nome:
            conn.close()
            return api_error("Nome obrigatório", 400, "VALIDATION_ERROR")
        cursor = conn.execute("INSERT INTO subtarefas (tarefa_id, nome) VALUES (?,?)", (task_id, nome))
        new_id = cursor.lastrowid
        conn.commit()
        row = conn.execute("SELECT * FROM subtarefas WHERE id=?", (new_id,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201
    rows = conn.execute("SELECT * FROM subtarefas WHERE tarefa_id=? ORDER BY criado_em ASC", (task_id,)).fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])


@bp.route("/api/subtasks/<int:id>", methods=["PATCH", "DELETE"])
@login_required
def api_subtask_detail(id):
    conn = get_db()
    subtask, access_error = require_subtask_access(conn, id, "membro")
    if access_error:
        conn.close()
        return access_error
    if request.method == "DELETE":
        conn.execute("DELETE FROM subtarefas WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Subtarefa eliminada"})
    payload = request.get_json(silent=True) or {}
    conn.execute("UPDATE subtarefas SET concluida=? WHERE id=?", (1 if payload.get("concluida") else 0, id))
    conn.commit()
    row = conn.execute("SELECT * FROM subtarefas WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))


@bp.route("/api/tasks/<int:task_id>/comments", methods=["GET", "POST"])
@login_required
def api_task_comments(task_id):
    conn = get_db()
    task, access_error = require_task_access(conn, task_id)
    if access_error:
        conn.close()
        return access_error
    if request.method == "POST":
        permission_error = require_project_permission(conn, task["projeto_id"], "membro")
        if permission_error:
            conn.close()
            return permission_error
        payload = request.get_json(silent=True) or {}
        texto = str(payload.get("texto", "")).strip()
        if not texto:
            conn.close()
            return api_error("Texto obrigatório", 400, "VALIDATION_ERROR")
        user_nome = session.get("nome", session.get("username", "Utilizador"))
        cursor = conn.execute(
            "INSERT INTO comentarios (projeto_id, tarefa_id, user_nome, texto) VALUES (?,?,?,?)",
            (task["projeto_id"], task_id, user_nome, texto),
        )
        new_id = cursor.lastrowid
        conn.commit()
        row = conn.execute("SELECT * FROM comentarios WHERE id=?", (new_id,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201
    rows = conn.execute("SELECT * FROM comentarios WHERE tarefa_id=? ORDER BY criado_em DESC", (task_id,)).fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])

