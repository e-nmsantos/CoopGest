from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, session

from coopgest.access import can_access_project, get_project_role, project_role_allows
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.email import send_email

bp = Blueprint("work_overview", __name__)


@bp.route("/api/recursos")
@login_required
def api_recursos():
    conn = get_db()
    rows = [
        row_to_dict(row)
        for row in conn.execute(
            """SELECT t.id, t.nome, t.responsavel, t.estado, t.prioridade, t.data_fim,
                      p.id as projeto_id, p.nome as projeto_nome
               FROM tarefas t JOIN projetos p ON t.projeto_id = p.id
               WHERE t.responsavel IS NOT NULL AND t.responsavel != ''
               ORDER BY t.responsavel, t.data_fim ASC"""
        ).fetchall()
        if can_access_project(conn, row["projeto_id"])
    ]
    conn.close()

    by_person = {}
    for row in rows:
        responsavel = row["responsavel"]
        if responsavel not in by_person:
            by_person[responsavel] = {"responsavel": responsavel, "tarefas": [], "abertas": 0, "concluidas": 0}
        by_person[responsavel]["tarefas"].append(row)
        if row["estado"] == "Concluída":
            by_person[responsavel]["concluidas"] += 1
        else:
            by_person[responsavel]["abertas"] += 1
    return jsonify(sorted(by_person.values(), key=lambda item: item["abertas"], reverse=True))


@bp.route("/api/my-work")
@login_required
def api_my_work():
    conn = get_db()
    today = datetime.now().date()
    user_names = {
        str(session.get("nome", "") or "").strip().lower(),
        str(session.get("username", "") or "").strip().lower(),
    }
    user_names.discard("")

    rows = conn.execute(
        """SELECT t.id, t.nome, t.descricao, t.responsavel, t.estado, t.prioridade, t.data_fim,
                  t.tags, t.criado_em, p.id as projeto_id, p.nome as projeto_nome,
                  COALESCE(pm.papel, '') as papel_projeto
           FROM tarefas t
           JOIN projetos p ON t.projeto_id = p.id
           LEFT JOIN projeto_membros pm ON pm.projeto_id = p.id AND pm.user_id = ?
           WHERE COALESCE(p.arquivado, 0) = 0
           ORDER BY CASE WHEN COALESCE(t.data_fim, '') = '' THEN 1 ELSE 0 END,
                    t.data_fim ASC, t.prioridade DESC""",
        (session["user_id"],),
    ).fetchall()

    tasks = []
    for row in rows:
        if not can_access_project(conn, row["projeto_id"]):
            continue
        responsavel = str(row["responsavel"] or "").strip()
        assigned_to_me = responsavel.lower() in user_names
        role = row["papel_projeto"] or get_project_role(conn, row["projeto_id"])
        can_edit = project_role_allows(role, "membro")
        needs_assignment = not responsavel and project_role_allows(role, "gestor")
        if not assigned_to_me and not needs_assignment:
            continue

        task = row_to_dict(row)
        state = str(task.get("estado") or "")
        is_done = state.lower().startswith("conclu")
        due = str(task.get("data_fim") or "").strip()
        bucket = "sem_data"
        days_until_due = None
        if due:
            try:
                due_date = datetime.strptime(due, "%Y-%m-%d").date()
                days_until_due = (due_date - today).days
                if is_done:
                    bucket = "concluidas"
                elif days_until_due < 0:
                    bucket = "atrasadas"
                elif days_until_due == 0:
                    bucket = "hoje"
                elif days_until_due <= 7:
                    bucket = "proximos_7_dias"
                else:
                    bucket = "futuras"
            except ValueError:
                bucket = "sem_data"
        elif is_done:
            bucket = "concluidas"

        task["bucket"] = bucket
        task["dias_ate_prazo"] = days_until_due
        task["assigned_to_me"] = assigned_to_me
        task["needs_assignment"] = needs_assignment
        task["can_edit"] = can_edit
        tasks.append(task)

    conn.close()
    open_tasks = [task for task in tasks if task["bucket"] != "concluidas"]
    summary = {
        "total": len(tasks),
        "abertas": len(open_tasks),
        "atrasadas": len([task for task in tasks if task["bucket"] == "atrasadas"]),
        "hoje": len([task for task in tasks if task["bucket"] == "hoje"]),
        "proximos_7_dias": len([task for task in tasks if task["bucket"] == "proximos_7_dias"]),
        "sem_data": len([task for task in tasks if task["bucket"] == "sem_data"]),
        "por_atribuir": len([task for task in tasks if task.get("needs_assignment")]),
    }
    return jsonify({"summary": summary, "tasks": tasks})


@bp.route("/api/digest/send", methods=["POST"])
@login_required
def api_digest_send():
    if session.get("papel") != "admin":
        return api_error("Apenas administradores", 403, "FORBIDDEN")

    conn = get_db()
    today = datetime.now().strftime("%Y-%m-%d")
    projetos_ativos = conn.execute("SELECT COUNT(*) FROM projetos WHERE estado='Em curso' AND arquivado=0").fetchone()[0]
    tarefas_atraso = conn.execute(
        "SELECT COUNT(*) FROM tarefas WHERE data_fim < ? AND estado != 'Concluída'",
        (today,),
    ).fetchone()[0]
    proximos_ms = [
        row_to_dict(row)
        for row in conn.execute(
            """SELECT m.nome, m.data_prevista, p.nome as projeto FROM milestones m
               JOIN projetos p ON m.projeto_id = p.id
               WHERE m.data_prevista BETWEEN ? AND date(?, '+14 days')
               AND m.estado != 'Concluído' LIMIT 10""",
            (today, today),
        ).fetchall()
    ]
    tarefas_pendentes = [
        row_to_dict(row)
        for row in conn.execute(
            """SELECT t.nome, t.data_fim, t.responsavel, p.nome as projeto FROM tarefas t
               JOIN projetos p ON t.projeto_id = p.id
               WHERE t.estado != 'Concluída' ORDER BY t.data_fim ASC LIMIT 10"""
        ).fetchall()
    ]
    conn.close()

    milestones_html = "".join(
        f'<li>{milestone["nome"]} - {milestone["projeto"]} ({milestone["data_prevista"]})</li>'
        for milestone in proximos_ms
    ) or "<li>Nenhum</li>"
    tasks_html = "".join(
        f'<li>{task["nome"]} - {task["projeto"]} '
        f'(prazo: {task["data_fim"] or "-"}, responsável: {task["responsavel"] or "-"})</li>'
        for task in tarefas_pendentes
    ) or "<li>Nenhuma</li>"

    html = f"""<h2>CoopGest - Digest Semanal ({today})</h2>
<p><strong>Projectos activos:</strong> {projetos_ativos}</p>
<p><strong>Tarefas em atraso:</strong> {tarefas_atraso}</p>
<h3>Milestones nos próximos 14 dias</h3><ul>{milestones_html}</ul>
<h3>Tarefas pendentes prioritárias</h3><ul>{tasks_html}</ul>"""

    send_email(["all"], f"Digest CoopGest {today}", html)
    return jsonify({"message": "Digest enviado", "preview": html})

