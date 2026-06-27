"""
Alert routes — project health alerts and email dispatch.
"""
from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from coopgest.access import require_project_permission
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("alerts", __name__)


@bp.route("/api/projects/<int:projeto_id>/alerts", methods=["GET"])
@login_required
def get_alerts(projeto_id: int):
    """Return current alerts for a project (no email sent)."""
    conn = get_db()
    err = require_project_permission(conn, projeto_id, "membro")
    if err:
        conn.close()
        return err
    try:
        from coopgest.services.email_alerts import build_project_alerts
        alerts = build_project_alerts(conn, projeto_id)
        total = sum(len(v) for v in alerts.values())
        return jsonify({"total": total, "alerts": alerts})
    finally:
        conn.close()


@bp.route("/api/projects/<int:projeto_id>/alerts/send", methods=["POST"])
@login_required
def send_alerts(projeto_id: int):
    """Manually trigger an alert email for a project."""
    conn = get_db()
    err = require_project_permission(conn, projeto_id, "gestor")
    if err:
        conn.close()
        return err
    try:
        payload = request.get_json(silent=True) or {}
        email = payload.get("email") or session.get("user_email")
        if not email:
            return api_error("Email de destinatário não especificado", 400, "VALIDATION_ERROR")

        from coopgest.services.email_alerts import send_project_alert_email
        from flask import current_app
        result = send_project_alert_email(
            current_app._get_current_object(), conn, projeto_id, email
        )
        return jsonify(result)
    finally:
        conn.close()


@bp.route("/api/system/send-alerts", methods=["POST"])
@login_required
def send_all_alerts():
    """Admin-only: collect alerts for all active projects and optionally dispatch emails."""
    if session.get("papel") != "admin":
        return api_error("Apenas administradores", 403, "FORBIDDEN")

    payload = request.get_json(silent=True) or {}
    dispatch_email = payload.get("email")

    conn = get_db()
    try:
        from coopgest.services.email_alerts import build_project_alerts, send_project_alert_email
        from flask import current_app

        projetos = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT id, nome FROM projetos WHERE arquivado=0 AND estado='Em curso'"
            ).fetchall()
        ]

        results = []
        total_alerts = 0

        for p in projetos:
            alerts = build_project_alerts(conn, p["id"])
            count = sum(len(v) for v in alerts.values())
            total_alerts += count
            entry: dict = {
                "projeto_id": p["id"],
                "projeto_nome": p["nome"],
                "total_alertas": count,
                "detalhe": {k: len(v) for k, v in alerts.items()},
                "email_enviado": False,
            }
            if dispatch_email and count > 0:
                result = send_project_alert_email(
                    current_app._get_current_object(), conn, p["id"], dispatch_email
                )
                entry["email_enviado"] = result.get("sent", False)
                if result.get("error"):
                    entry["email_erro"] = result["error"]
            results.append(entry)

        projetos_com_alertas = sum(1 for r in results if r["total_alertas"] > 0)
        return jsonify({
            "projects_checked": len(projetos),
            "projects_with_alerts": projetos_com_alertas,
            "total_alerts": total_alerts,
            "email_dispatched": bool(dispatch_email),
            "results": results,
        })
    finally:
        conn.close()
