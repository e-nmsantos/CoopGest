from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, session

from coopgest.access import filter_accessible_projects
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import login_required
from coopgest.services.activity import notify_in_app_once
from coopgest.services.reports import build_portfolio_executive_report, build_project_executive_report, build_project_executive_reports_batch

bp = Blueprint("dashboard", __name__)


@bp.route("/api/dashboard")
@login_required
def api_dashboard():
    conn = get_db()
    accessible_projects = filter_accessible_projects(
        conn,
        conn.execute("SELECT id, nome, estado, criado_em FROM projetos WHERE arquivado=0 ORDER BY criado_em DESC").fetchall(),
    )
    accessible_ids = [project["id"] for project in accessible_projects]

    if not accessible_ids:
        conn.close()
        return jsonify({
            "stats": {
                "projetos": 0,
                "parceiros": 0,
                "tarefas": 0,
                "milestones": 0,
                "tarefas_concluidas": 0,
                "milestones_concluidos": 0,
                "orcamento_total": 0,
                "orcamento_executado": 0,
                "total_beneficiarios": 0,
                "projetos_por_estado": {},
                "saude_sistema": {"score": 100, "status": "Excelente", "atrasadas": 0},
                "portfolio": {
                    "projetos_com_tarefas_atrasadas": 0,
                    "milestones_proximos": 0,
                    "projetos_sem_tarefas": 0,
                    "execucao_orcamental_percent": 0,
                },
            },
            "projetos_recentes": [],
            "tarefas_pendentes": [],
            "atividades_recentes": [],
        })

    placeholders = ",".join("?" * len(accessible_ids))
    stats = {
        "projetos": len(accessible_ids),
        "parceiros": conn.execute("SELECT COUNT(*) FROM parceiros").fetchone()[0],
        "tarefas": conn.execute(
            f"SELECT COUNT(*) FROM tarefas WHERE estado != 'Concluída' AND projeto_id IN ({placeholders})",
            accessible_ids,
        ).fetchone()[0],
        "milestones": conn.execute(
            f"SELECT COUNT(*) FROM milestones WHERE estado != 'Concluído' AND projeto_id IN ({placeholders})",
            accessible_ids,
        ).fetchone()[0],
        "tarefas_concluidas": conn.execute(
            f"SELECT COUNT(*) FROM tarefas WHERE estado = 'Concluída' AND projeto_id IN ({placeholders})",
            accessible_ids,
        ).fetchone()[0],
        "milestones_concluidos": conn.execute(
            f"SELECT COUNT(*) FROM milestones WHERE estado = 'Concluído' AND projeto_id IN ({placeholders})",
            accessible_ids,
        ).fetchone()[0],
        "orcamento_total": conn.execute(
            f"SELECT COALESCE(SUM(valor_previsto),0) FROM orcamento WHERE tipo='Receita' AND projeto_id IN ({placeholders})",
            accessible_ids,
        ).fetchone()[0],
        "orcamento_executado": conn.execute(
            f"SELECT COALESCE(SUM(valor_real),0) FROM orcamento WHERE tipo='Receita' AND projeto_id IN ({placeholders})",
            accessible_ids,
        ).fetchone()[0],
        "total_beneficiarios": conn.execute(
            f"SELECT COALESCE(SUM(numero),0) FROM beneficiarios WHERE projeto_id IN ({placeholders})",
            accessible_ids,
        ).fetchone()[0],
        "projetos_por_estado": {
            estado: sum(1 for project in accessible_projects if project["estado"] == estado)
            for estado in {project["estado"] for project in accessible_projects}
        },
    }

    projetos_recentes = [row_to_dict(row) for row in accessible_projects[:5]]
    total_tarefas_ativas = stats["tarefas"]
    tarefas_atrasadas = conn.execute(
        f"SELECT COUNT(*) FROM tarefas WHERE estado != 'Concluída' AND data_fim < date('now') AND projeto_id IN ({placeholders})",
        accessible_ids,
    ).fetchone()[0]

    saude_score = 100
    status_saude = "Excelente"
    if total_tarefas_ativas > 0:
        ratio_atraso = tarefas_atrasadas / total_tarefas_ativas
        saude_score = max(0, 100 - (ratio_atraso * 100))
        if saude_score < 50:
            status_saude = "Crítico"
        elif saude_score < 80:
            status_saude = "Atenção"
    stats["saude_sistema"] = {"score": int(saude_score), "status": status_saude, "atrasadas": tarefas_atrasadas}

    projetos_com_tarefas_atrasadas = conn.execute(
        f"""SELECT COUNT(DISTINCT projeto_id)
            FROM tarefas
            WHERE estado != 'Concluída'
              AND data_fim IS NOT NULL
              AND data_fim < date('now')
              AND projeto_id IN ({placeholders})""",
        accessible_ids,
    ).fetchone()[0]
    milestones_proximos = conn.execute(
        f"""SELECT COUNT(*)
            FROM milestones
            WHERE estado != 'Concluído'
              AND data_prevista IS NOT NULL
              AND data_prevista BETWEEN date('now') AND date('now', '+14 day')
              AND projeto_id IN ({placeholders})""",
        accessible_ids,
    ).fetchone()[0]
    projetos_sem_tarefas = conn.execute(
        f"""SELECT COUNT(*)
            FROM projetos p
            WHERE p.id IN ({placeholders})
              AND NOT EXISTS (
                  SELECT 1 FROM tarefas t WHERE t.projeto_id = p.id
              )""",
        accessible_ids,
    ).fetchone()[0]
    execucao_orcamental_percent = (
        round((stats["orcamento_executado"] / stats["orcamento_total"]) * 100)
        if stats["orcamento_total"] else 0
    )
    stats["portfolio"] = {
        "projetos_com_tarefas_atrasadas": projetos_com_tarefas_atrasadas,
        "milestones_proximos": milestones_proximos,
        "projetos_sem_tarefas": projetos_sem_tarefas,
        "execucao_orcamental_percent": execucao_orcamental_percent,
    }

    priority_weight = {"Alta": 0, "Média": 1, "Baixa": 2}
    portfolio_recommendations = []
    batch_reports = build_project_executive_reports_batch(conn, accessible_projects)
    for project in accessible_projects:
        report = batch_reports.get(project["id"])
        if not report:
            continue
        for recommendation in report["recommendations"]:
            portfolio_recommendations.append({
                **recommendation,
                "project_id": project["id"],
                "project_name": project["nome"],
                "health_score": report["health"]["score"],
                "health_status": report["health"]["status"],
            })
    portfolio_recommendations = sorted(
        portfolio_recommendations,
        key=lambda item: (priority_weight.get(item["priority"], 3), item["health_score"]),
    )[:8]

    tarefas_pendentes = [
        row_to_dict(row)
        for row in conn.execute(
            f"""SELECT t.*, p.nome as projeto_nome FROM tarefas t
                JOIN projetos p ON t.projeto_id = p.id
                WHERE t.estado != "Concluída" AND t.projeto_id IN ({placeholders})
                ORDER BY t.data_fim ASC
                LIMIT 5""",
            accessible_ids,
        ).fetchall()
    ]
    atividades_recentes = [
        row_to_dict(row)
        for row in conn.execute("SELECT * FROM auditoria ORDER BY criado_em DESC LIMIT 10").fetchall()
    ]
    conn.close()

    return jsonify({
        "stats": stats,
        "projetos_recentes": projetos_recentes,
        "tarefas_pendentes": tarefas_pendentes,
        "portfolio_recommendations": portfolio_recommendations,
        "atividades_recentes": atividades_recentes,
    })


@bp.route("/api/portfolio/executive-report")
@login_required
def api_portfolio_executive_report():
    conn = get_db()
    accessible_projects = filter_accessible_projects(
        conn,
        conn.execute("SELECT id, nome, estado, criado_em FROM projetos WHERE arquivado=0 ORDER BY criado_em DESC").fetchall(),
    )
    report = build_portfolio_executive_report(conn, accessible_projects)
    conn.close()
    return jsonify(report)


@bp.route("/api/portfolio/automations/run", methods=["POST"])
@login_required
def api_portfolio_automations_run():
    conn = get_db()
    accessible_projects = filter_accessible_projects(
        conn,
        conn.execute("SELECT id, nome, estado, criado_em FROM projetos WHERE arquivado=0 ORDER BY criado_em DESC").fetchall(),
    )
    report = build_portfolio_executive_report(conn, accessible_projects)

    created = 0
    skipped = 0
    processed_projects = set()
    high_priority = [item for item in report["recommendations"] if item["priority"] == "Alta"]
    recommendations = high_priority or report["recommendations"][:5]

    for recommendation in recommendations:
        project_id = recommendation["project_id"]
        processed_projects.add(project_id)
        recipients = [
            row["email"]
            for row in conn.execute(
                """SELECT u.email
                   FROM utilizadores u
                   JOIN projeto_membros pm ON pm.user_id = u.id
                   WHERE pm.projeto_id = ? AND COALESCE(u.email, '') != '' """,
                (project_id,),
            ).fetchall()
        ]
        if not recipients and session.get("user_email"):
            recipients = [session["user_email"]]

        subject = f"{recommendation['project_name']}: {recommendation['title']}"
        for recipient in recipients:
            if notify_in_app_once(conn, recipient, subject, recommendation["description"], recommendation["url"]):
                created += 1
            else:
                skipped += 1

    conn.commit()
    conn.close()
    return jsonify({
        "created": created,
        "skipped": skipped,
        "projects": len(processed_projects),
        "recommendations": len(recommendations),
    })
