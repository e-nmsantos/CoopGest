"""
Email alert service — identifies overdue tasks, milestones, risks and stale
logframe indicators, then optionally sends a summary email via Flask-Mail.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any


# ── Alert builder ─────────────────────────────────────────────────────────────

def build_project_alerts(conn, projeto_id: int) -> dict[str, list]:
    """
    Identify alerts for a project.

    Returns:
        {
            "tarefas_atrasadas": [...],
            "milestones_atrasados": [...],
            "riscos_para_revisao": [...],
            "indicadores_sem_atualizacao": [...],
        }
    """
    today = datetime.now().date()
    today_iso = today.isoformat()
    stale_cutoff = (today - timedelta(days=90)).isoformat()

    # Overdue tasks
    tarefas = [
        dict(r)
        for r in conn.execute(
            """SELECT * FROM tarefas
               WHERE projeto_id=?
                 AND estado != 'Concluída'
                 AND data_fim IS NOT NULL
                 AND data_fim < ?""",
            (projeto_id, today_iso),
        ).fetchall()
    ]

    # Overdue milestones
    milestones = [
        dict(r)
        for r in conn.execute(
            """SELECT * FROM milestones
               WHERE projeto_id=?
                 AND estado != 'Concluído'
                 AND data_prevista IS NOT NULL
                 AND data_prevista < ?""",
            (projeto_id, today_iso),
        ).fetchall()
    ]

    # Risks due for review (proxima_revisao in the past, not yet mitigated/concretised)
    riscos = [
        dict(r)
        for r in conn.execute(
            """SELECT * FROM riscos
               WHERE projeto_id=?
                 AND proxima_revisao != ''
                 AND proxima_revisao < ?
                 AND estado NOT IN ('Mitigado', 'Concretizado')""",
            (projeto_id, today_iso),
        ).fetchall()
    ]

    # Logframe indicators not updated in 90+ days
    indicadores = [
        dict(r)
        for r in conn.execute(
            """SELECT * FROM impacto_quadro_logico
               WHERE projeto_id=?
                 AND atualizado_em < ?""",
            (projeto_id, stale_cutoff),
        ).fetchall()
    ]

    return {
        "tarefas_atrasadas": tarefas,
        "milestones_atrasados": milestones,
        "riscos_para_revisao": riscos,
        "indicadores_sem_atualizacao": indicadores,
    }


# ── Email sender ──────────────────────────────────────────────────────────────

def send_project_alert_email(app, conn, projeto_id: int, recipient_email: str) -> dict[str, Any]:
    """
    Send alert email via Flask-Mail.

    Returns:
        {"sent": True/False, "alerts": int, "error": str|None}
    """
    from flask_mail import Mail, Message

    alerts = build_project_alerts(conn, projeto_id)
    total = sum(len(v) for v in alerts.values())

    if total == 0:
        return {"sent": False, "alerts": 0, "reason": "Sem alertas a reportar"}

    projeto = conn.execute(
        "SELECT nome FROM projetos WHERE id=?", (projeto_id,)
    ).fetchone()
    nome_projeto = projeto["nome"] if projeto else f"Projeto #{projeto_id}"

    subject = f"[CoopGest] Alertas — {nome_projeto}"
    body = _build_email_body(nome_projeto, alerts)

    try:
        mail = Mail(app)
        msg = Message(
            subject=subject,
            recipients=[recipient_email],
            body=body,
            sender=app.config.get("MAIL_DEFAULT_SENDER", "noreply@coopgest.pt"),
        )
        mail.send(msg)
        return {"sent": True, "alerts": total}
    except Exception as exc:
        return {"sent": False, "alerts": total, "error": str(exc)}


# ── Email body builder ────────────────────────────────────────────────────────

def _build_email_body(nome_projeto: str, alerts: dict) -> str:
    lines = [f"Resumo de alertas — {nome_projeto}", "=" * 50, ""]

    if alerts["tarefas_atrasadas"]:
        lines.append(f"TAREFAS ATRASADAS ({len(alerts['tarefas_atrasadas'])}):")
        for t in alerts["tarefas_atrasadas"]:
            lines.append(
                f"  • {t.get('title', t.get('nome', '?'))} (prazo: {t.get('data_fim', '?')})"
            )
        lines.append("")

    if alerts["milestones_atrasados"]:
        lines.append(f"MARCOS ATRASADOS ({len(alerts['milestones_atrasados'])}):")
        for m in alerts["milestones_atrasados"]:
            lines.append(
                f"  • {m.get('titulo', m.get('nome', '?'))} (previsto: {m.get('data_prevista', '?')})"
            )
        lines.append("")

    if alerts["riscos_para_revisao"]:
        lines.append(f"RISCOS PARA REVISÃO ({len(alerts['riscos_para_revisao'])}):")
        for r in alerts["riscos_para_revisao"]:
            lines.append(
                f"  • {r.get('descricao', '?')} (revisão: {r.get('proxima_revisao', '?')})"
            )
        lines.append("")

    if alerts["indicadores_sem_atualizacao"]:
        lines.append(f"INDICADORES SEM ATUALIZAÇÃO ({len(alerts['indicadores_sem_atualizacao'])}):")
        for i in alerts["indicadores_sem_atualizacao"]:
            lines.append(f"  • {i.get('indicador', '?')}")
        lines.append("")

    lines.append("--")
    lines.append("Enviado pelo CoopGest | Gestão de Projetos de Cooperação")
    return "\n".join(lines)
