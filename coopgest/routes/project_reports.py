from __future__ import annotations

from flask import Blueprint, Response, jsonify, session

from coopgest.access import get_project_role, project_role_allows, require_project_access, require_project_permission
from coopgest.db import get_db
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import notify_in_app
from coopgest.services.reports import build_project_executive_report

bp = Blueprint("project_reports", __name__)


@bp.route("/api/projects/<int:id>/executive-report")
@login_required
def api_project_executive_report(id):
    conn = get_db()
    access_error = require_project_permission(conn, id, "gestor")
    if access_error:
        conn.close()
        return access_error

    report = build_project_executive_report(conn, id)
    conn.close()
    if not report:
        return api_error("Projeto não encontrado", 404, "NOT_FOUND")
    return jsonify(report)


@bp.route("/api/projects/<int:id>/permissions")
@login_required
def api_project_permissions(id):
    conn = get_db()
    access_error = require_project_access(conn, id)
    if access_error:
        conn.close()
        return access_error
    role = get_project_role(conn, id)
    conn.close()
    return jsonify({
        "role": role,
        "can_view": True,
        "can_edit": project_role_allows(role, "membro"),
        "can_manage": project_role_allows(role, "gestor"),
        "is_admin": role == "admin",
    })


@bp.route("/api/projects/<int:id>/executive-report/notify", methods=["POST"])
@login_required
def api_project_executive_report_notify(id):
    conn = get_db()
    access_error = require_project_permission(conn, id, "gestor")
    if access_error:
        conn.close()
        return access_error

    report = build_project_executive_report(conn, id)
    if not report:
        conn.close()
        return api_error("Projeto não encontrado", 404, "NOT_FOUND")

    recipients = [
        row["email"]
        for row in conn.execute(
            """SELECT u.email
               FROM utilizadores u
               JOIN projeto_membros pm ON pm.user_id = u.id
               WHERE pm.projeto_id = ? AND COALESCE(u.email, '') != '' """,
            (id,),
        ).fetchall()
    ]
    if not recipients and session.get("user_email"):
        recipients = [session["user_email"]]

    high_priority = [item for item in report["recommendations"] if item["priority"] == "Alta"]
    recommendations = high_priority or report["recommendations"][:3]
    for recipient in recipients:
        for recommendation in recommendations:
            notify_in_app(
                conn,
                recipient,
                f"Ação recomendada: {recommendation['title']}",
                recommendation["description"],
                recommendation["url"],
            )

    conn.commit()
    conn.close()
    return jsonify({"created": len(recipients) * len(recommendations), "recipients": len(recipients)})


@bp.route("/api/projects/<int:id>/executive-report/pdf")
@login_required
def api_project_executive_report_pdf(id):
    conn = get_db()
    access_error = require_project_permission(conn, id, "gestor")
    if access_error:
        conn.close()
        return access_error

    report = build_project_executive_report(conn, id)
    conn.close()
    if not report:
        return api_error("Projeto não encontrado", 404, "NOT_FOUND")

    try:
        from coopgest.services.pdf_report import generate_project_pdf
        pdf_bytes = generate_project_pdf(report)
    except ImportError:
        return api_error("reportlab não instalado — execute: pip install reportlab", 501, "NOT_IMPLEMENTED")

    nome = report.get("projeto", {}).get("nome", "relatorio")
    safe_nome = "".join(c if c.isalnum() or c in " -_" else "" for c in nome).strip().replace(" ", "_")
    filename = f"relatorio_{safe_nome}.pdf"

    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
