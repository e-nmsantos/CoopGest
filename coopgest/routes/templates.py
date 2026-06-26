from __future__ import annotations

from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, session

from coopgest.access import can_access_project, require_project_permission, resolve_project_scope
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit

bp = Blueprint("templates", __name__)


def _template_payload(conn, template_row):
    data = row_to_dict(template_row)
    template_id = template_row["id"]
    data["milestones"] = [
        row_to_dict(row)
        for row in conn.execute(
            "SELECT * FROM template_milestones WHERE template_id=?",
            (template_id,),
        ).fetchall()
    ]
    data["tarefas"] = [
        row_to_dict(row)
        for row in conn.execute(
            "SELECT * FROM template_tarefas WHERE template_id=?",
            (template_id,),
        ).fetchall()
    ]
    data["orcamento"] = [
        row_to_dict(row)
        for row in conn.execute(
            "SELECT * FROM template_orcamento WHERE template_id=?",
            (template_id,),
        ).fetchall()
    ]
    return data


@bp.route("/api/templates", methods=["GET", "POST"])
@login_required
def api_templates():
    conn = get_db()
    raw_project_id = (
        (request.get_json(silent=True) or {}).get("projeto_id")
        if request.method == "POST"
        else request.args.get("projeto_id")
    )
    projeto_id, error_response = resolve_project_scope(conn, raw_project_id, required=False)
    if error_response:
        conn.close()
        return error_response

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        nome = str(payload.get("nome", "")).strip()
        if not nome:
            conn.close()
            return api_error("Nome obrigatório", 400, "VALIDATION_ERROR")
        cursor = conn.execute(
            "INSERT INTO templates (nome, descricao, projeto_id) VALUES (?,?,?)",
            (nome, payload.get("descricao", "") or "", projeto_id),
        )
        new_id = cursor.lastrowid
        conn.commit()
        row = row_to_dict(conn.execute("SELECT * FROM templates WHERE id=?", (new_id,)).fetchone())
        conn.close()
        return jsonify(row), 201

    if projeto_id:
        rows = conn.execute(
            "SELECT * FROM templates WHERE projeto_id=? ORDER BY criado_em DESC",
            (projeto_id,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM templates WHERE projeto_id IS NULL ORDER BY criado_em DESC").fetchall()
    result = [_template_payload(conn, row) for row in rows]
    conn.close()
    return jsonify(result)


@bp.route("/api/templates/<int:id>", methods=["GET", "DELETE"])
@login_required
def api_template_detail(id):
    conn = get_db()
    template = conn.execute("SELECT * FROM templates WHERE id=?", (id,)).fetchone()
    if not template:
        conn.close()
        return api_error("Template não encontrado", 404, "NOT_FOUND")
    if template["projeto_id"] and not can_access_project(conn, template["projeto_id"]):
        conn.close()
        return api_error("Sem acesso a este projeto", 403, "FORBIDDEN")
    if request.method == "DELETE":
        conn.execute("DELETE FROM templates WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Template eliminado"})
    data = _template_payload(conn, template)
    conn.close()
    return jsonify(data)


@bp.route("/api/projects/<int:id>/save-as-template", methods=["POST"])
@login_required
def api_project_save_template(id):
    conn = get_db()
    project = conn.execute("SELECT * FROM projetos WHERE id=?", (id,)).fetchone()
    if not project:
        conn.close()
        return api_error("Projeto não encontrado", 404, "NOT_FOUND")
    permission_error = require_project_permission(conn, id, "gestor")
    if permission_error:
        conn.close()
        return permission_error

    payload = request.get_json(silent=True) or {}
    nome = str(payload.get("nome", f'Template: {project["nome"]}')).strip()
    cursor = conn.execute(
        "INSERT INTO templates (nome, descricao, projeto_id) VALUES (?,?,?)",
        (nome, project["descricao"] or "", id),
    )
    template_id = cursor.lastrowid

    start = project["data_inicio"]
    try:
        start_date = datetime.strptime(start, "%Y-%m-%d") if start else datetime.now()
    except (ValueError, TypeError):
        start_date = datetime.now()

    for milestone in conn.execute("SELECT * FROM milestones WHERE projeto_id=?", (id,)).fetchall():
        try:
            milestone_date = datetime.strptime(milestone["data_prevista"], "%Y-%m-%d")
            offset = (milestone_date - start_date).days
        except (ValueError, TypeError):
            offset = 0
        conn.execute(
            "INSERT INTO template_milestones (template_id, nome, descricao, dias_offset) VALUES (?,?,?,?)",
            (template_id, milestone["nome"], milestone["descricao"] or "", offset),
        )

    for task in conn.execute("SELECT * FROM tarefas WHERE projeto_id=?", (id,)).fetchall():
        try:
            task_date = datetime.strptime(task["data_fim"], "%Y-%m-%d")
            offset = (task_date - start_date).days
        except (ValueError, TypeError):
            offset = 0
        conn.execute(
            "INSERT INTO template_tarefas (template_id, nome, descricao, prioridade, dias_offset) VALUES (?,?,?,?,?)",
            (template_id, task["nome"], task["descricao"] or "", task["prioridade"] or "Normal", offset),
        )

    for budget in conn.execute("SELECT * FROM orcamento WHERE projeto_id=?", (id,)).fetchall():
        conn.execute(
            "INSERT INTO template_orcamento (template_id, tipo, categoria, descricao, valor_previsto) VALUES (?,?,?,?,?)",
            (template_id, budget["tipo"], budget["categoria"], budget["descricao"], budget["valor_previsto"]),
        )
    conn.commit()
    conn.close()
    return jsonify({"id": template_id, "nome": nome}), 201


@bp.route("/api/templates/<int:id>/apply", methods=["POST"])
@login_required
def api_template_apply(id):
    conn = get_db()
    template = conn.execute("SELECT * FROM templates WHERE id=?", (id,)).fetchone()
    if not template:
        conn.close()
        return api_error("Template não encontrado", 404, "NOT_FOUND")
    if template["projeto_id"] and not can_access_project(conn, template["projeto_id"]):
        conn.close()
        return api_error("Sem acesso a este projeto", 403, "FORBIDDEN")

    payload = request.get_json(silent=True) or {}
    nome = str(payload.get("nome", template["nome"])).strip()
    start_str = payload.get("data_inicio", datetime.now().strftime("%Y-%m-%d"))
    try:
        start_date = datetime.strptime(start_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        start_date = datetime.now()

    max_offset = 90
    for milestone in conn.execute("SELECT dias_offset FROM template_milestones WHERE template_id=?", (id,)).fetchall():
        max_offset = max(max_offset, milestone["dias_offset"])
    for task in conn.execute("SELECT dias_offset FROM template_tarefas WHERE template_id=?", (id,)).fetchall():
        max_offset = max(max_offset, task["dias_offset"])
    end_date = start_date + timedelta(days=max_offset)

    cursor = conn.execute(
        "INSERT INTO projetos (nome, descricao, data_inicio, data_fim, estado) VALUES (?,?,?,?,?)",
        (nome, template["descricao"], start_str, end_date.strftime("%Y-%m-%d"), "Planeamento"),
    )
    project_id = cursor.lastrowid
    conn.execute(
        "INSERT OR IGNORE INTO projeto_membros (projeto_id, user_id, papel) VALUES (?,?,?)",
        (project_id, session["user_id"], "gestor"),
    )

    for milestone in conn.execute("SELECT * FROM template_milestones WHERE template_id=?", (id,)).fetchall():
        milestone_date = (start_date + timedelta(days=milestone["dias_offset"])).strftime("%Y-%m-%d")
        conn.execute(
            "INSERT INTO milestones (projeto_id, nome, descricao, data_prevista) VALUES (?,?,?,?)",
            (project_id, milestone["nome"], milestone["descricao"], milestone_date),
        )
    for task in conn.execute("SELECT * FROM template_tarefas WHERE template_id=?", (id,)).fetchall():
        task_date = (start_date + timedelta(days=task["dias_offset"])).strftime("%Y-%m-%d")
        conn.execute(
            "INSERT INTO tarefas (projeto_id, nome, descricao, prioridade, data_fim) VALUES (?,?,?,?,?)",
            (project_id, task["nome"], task["descricao"], task["prioridade"], task_date),
        )
    for budget in conn.execute("SELECT * FROM template_orcamento WHERE template_id=?", (id,)).fetchall():
        conn.execute(
            "INSERT INTO orcamento (projeto_id, tipo, categoria, descricao, valor_previsto) VALUES (?,?,?,?,?)",
            (project_id, budget["tipo"], budget["categoria"], budget["descricao"], budget["valor_previsto"]),
        )
    log_audit(conn, "criado_de_template", "projeto", project_id, f'Template: {template["nome"]}')
    conn.commit()
    new_project = row_to_dict(conn.execute("SELECT * FROM projetos WHERE id=?", (project_id,)).fetchone())
    conn.close()
    return jsonify(new_project), 201

