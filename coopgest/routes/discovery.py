from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request

from coopgest.access import can_access_project, resolve_project_scope
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("discovery", __name__)


@bp.route("/api/search")
@login_required
def api_search():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify({"projetos": [], "tarefas": [], "parceiros": []})
    like = f"%{q}%"
    conn = get_db()
    projetos = [
        row_to_dict(row) for row in conn.execute(
            "SELECT id, nome, estado FROM projetos WHERE nome LIKE ? OR descricao LIKE ? LIMIT 5",
            (like, like),
        ).fetchall()
        if can_access_project(conn, row["id"])
    ]
    tarefas = [
        row_to_dict(row) for row in conn.execute(
            """SELECT t.id, t.nome, t.estado, t.projeto_id, p.nome as projeto_nome
               FROM tarefas t JOIN projetos p ON t.projeto_id = p.id
               WHERE t.nome LIKE ? OR t.descricao LIKE ? LIMIT 5""",
            (like, like),
        ).fetchall()
        if can_access_project(conn, row["projeto_id"])
    ]
    parceiros = [
        row_to_dict(row) for row in conn.execute(
            "SELECT id, nome, tipo FROM parceiros WHERE nome LIKE ? OR email LIKE ? LIMIT 5",
            (like, like),
        ).fetchall()
    ]
    conn.close()
    return jsonify({"projetos": projetos, "tarefas": tarefas, "parceiros": parceiros})


@bp.route("/api/calendar")
@login_required
def api_calendar():
    month = request.args.get("month", datetime.now().strftime("%Y-%m"))
    try:
        year, mon = int(month[:4]), int(month[5:7])
        if not (1 <= mon <= 12) or year < 1:
            raise ValueError("Mês fora de intervalo")
    except (ValueError, IndexError):
        return api_error("Mês inválido (use YYYY-MM)", 400, "BAD_REQUEST")

    start = f"{year:04d}-{mon:02d}-01"
    end = f"{year + 1:04d}-01-01" if mon == 12 else f"{year:04d}-{mon + 1:02d}-01"

    conn = get_db()
    projeto_id, error_response = resolve_project_scope(conn, request.args.get("projeto_id"))
    if error_response:
        conn.close()
        return error_response

    milestone_sql = """SELECT m.id, m.nome, m.data_prevista as data, m.estado,
                              p.id as projeto_id, p.nome as projeto_nome
                       FROM milestones m JOIN projetos p ON m.projeto_id = p.id
                       WHERE m.data_prevista >= ? AND m.data_prevista < ?"""
    tarefa_sql = """SELECT t.id, t.nome, t.data_fim as data, t.estado, t.prioridade,
                           p.id as projeto_id, p.nome as projeto_nome
                    FROM tarefas t JOIN projetos p ON t.projeto_id = p.id
                    WHERE t.data_fim >= ? AND t.data_fim < ? AND t.data_fim != ''"""
    milestone_params = [start, end]
    tarefa_params = [start, end]
    if projeto_id is not None:
        milestone_sql += " AND p.id = ?"
        tarefa_sql += " AND p.id = ?"
        milestone_params.append(projeto_id)
        tarefa_params.append(projeto_id)

    milestones = [
        row_to_dict(row) for row in conn.execute(milestone_sql, milestone_params).fetchall()
        if can_access_project(conn, row["projeto_id"])
    ]
    tarefas = [
        row_to_dict(row) for row in conn.execute(tarefa_sql, tarefa_params).fetchall()
        if can_access_project(conn, row["projeto_id"])
    ]
    conn.close()

    today = datetime.now().strftime("%Y-%m-%d")
    for milestone in milestones:
        milestone["tipo"] = "milestone"
        milestone["overdue"] = milestone.get("data", "") < today and milestone.get("estado") != "Concluído"
    for tarefa in tarefas:
        tarefa["tipo"] = "tarefa"
        tarefa["overdue"] = tarefa.get("data", "") < today and tarefa.get("estado") != "Concluída"
    return jsonify({"milestones": milestones, "tarefas": tarefas})

