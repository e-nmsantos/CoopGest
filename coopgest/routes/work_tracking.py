from __future__ import annotations

import sqlite3
from datetime import datetime

from flask import Blueprint, jsonify, request, session

from coopgest.access import require_project_access, require_project_permission, require_row_project_access, require_task_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit

bp = Blueprint("work_tracking", __name__)


@bp.route("/api/tasks/<int:task_id>/hours", methods=["POST"])
@login_required
def api_task_hours(task_id):
    conn = get_db()
    tarefa, access_error = require_task_access(conn, task_id, "membro")
    if access_error:
        conn.close()
        return access_error
    payload = request.get_json(silent=True) or {}
    horas = float(payload.get("horas", 0) or 0)
    if horas <= 0:
        conn.close()
        return api_error("Horas deve ser positivo", 400, "VALIDATION_ERROR")
    user_nome = session.get("nome", session.get("username", "Utilizador"))
    cursor = conn.execute(
        "INSERT INTO registos_horas (tarefa_id, projeto_id, user_nome, horas, descricao, data_registo) VALUES (?,?,?,?,?,?)",
        (
            task_id,
            tarefa["projeto_id"],
            user_nome,
            horas,
            payload.get("descricao", "") or "",
            payload.get("data_registo", "") or datetime.now().strftime("%Y-%m-%d"),
        ),
    )
    new_id = cursor.lastrowid
    log_audit(conn, "registou_horas", "horas", new_id, f'{horas:g}h em {tarefa["nome"]}', tarefa["projeto_id"])
    conn.commit()
    row = conn.execute("SELECT * FROM registos_horas WHERE id=?", (new_id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)), 201


@bp.route("/api/projects/<int:projeto_id>/hours", methods=["GET"])
@login_required
def api_project_hours(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error
    rows = [row_to_dict(row) for row in conn.execute(
        """SELECT rh.*, t.nome as tarefa_nome
           FROM registos_horas rh
           LEFT JOIN tarefas t ON rh.tarefa_id = t.id
           WHERE rh.projeto_id=?
           ORDER BY rh.data_registo DESC""",
        (projeto_id,),
    ).fetchall()]
    total = sum(row["horas"] for row in rows)
    por_pessoa = {}
    por_tarefa = {}
    for row in rows:
        por_pessoa[row["user_nome"]] = por_pessoa.get(row["user_nome"], 0) + row["horas"]
        tarefa_nome = row.get("tarefa_nome") or "Sem tarefa"
        por_tarefa[tarefa_nome] = por_tarefa.get(tarefa_nome, 0) + row["horas"]
    conn.close()
    return jsonify({"registos": rows, "total": total, "por_pessoa": por_pessoa, "por_tarefa": por_tarefa})


@bp.route("/api/hours/<int:id>", methods=["DELETE"])
@login_required
def api_hours_detail(id):
    conn = get_db()
    row, access_error = require_row_project_access(conn, "registos_horas", id, "Registo não encontrado", "membro")
    if access_error:
        conn.close()
        return access_error
    log_audit(conn, "eliminado", "horas", id, f'{row["horas"]}h', row["projeto_id"])
    conn.execute("DELETE FROM registos_horas WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Registo eliminado"})


@bp.route("/api/tasks/<int:task_id>/dependencies", methods=["POST", "GET"])
@login_required
def api_task_dependencies(task_id):
    conn = get_db()
    task, access_error = require_task_access(conn, task_id)
    if access_error:
        conn.close()
        return access_error
    if request.method == "GET":
        rows = conn.execute("SELECT depende_de FROM tarefa_dependencias WHERE tarefa_id=?", (task_id,)).fetchall()
        conn.close()
        return jsonify([row["depende_de"] for row in rows])
    permission_error = require_project_permission(conn, task["projeto_id"], "membro")
    if permission_error:
        conn.close()
        return permission_error
    payload = request.get_json(silent=True) or {}
    dep_id = int(payload.get("depende_de", 0) or 0)
    if not dep_id or dep_id == task_id:
        conn.close()
        return api_error("Dependência inválida", 400, "VALIDATION_ERROR")
    dep_task, access_error = require_task_access(conn, dep_id)
    if access_error:
        conn.close()
        return access_error
    if dep_task["projeto_id"] != task["projeto_id"]:
        conn.close()
        return api_error("Dependência deve pertencer ao mesmo projeto", 400, "VALIDATION_ERROR")
    if conn.execute("SELECT 1 FROM tarefa_dependencias WHERE tarefa_id=? AND depende_de=?", (dep_id, task_id)).fetchone():
        conn.close()
        return api_error("Criaria um ciclo de dependências", 400, "VALIDATION_ERROR")
    try:
        conn.execute("INSERT INTO tarefa_dependencias (tarefa_id, depende_de) VALUES (?,?)", (task_id, dep_id))
        log_audit(conn, "criada", "dependencia", task_id, f"Depende de tarefa #{dep_id}", task["projeto_id"])
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return api_error("Dependência já existe", 409, "CONFLICT")
    conn.close()
    return jsonify({"tarefa_id": task_id, "depende_de": dep_id}), 201


@bp.route("/api/tasks/<int:task_id>/dependencies/<int:dep_id>", methods=["DELETE"])
@login_required
def api_task_dependency_delete(task_id, dep_id):
    conn = get_db()
    task, access_error = require_task_access(conn, task_id, "membro")
    if access_error:
        conn.close()
        return access_error
    log_audit(conn, "eliminada", "dependencia", task_id, f"Dependencia removida: #{dep_id}", task["projeto_id"])
    conn.execute("DELETE FROM tarefa_dependencias WHERE tarefa_id=? AND depende_de=?", (task_id, dep_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Dependência removida"})

