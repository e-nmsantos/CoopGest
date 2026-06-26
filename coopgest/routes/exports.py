"""
Export routes — Excel workbook, donor PDF reports, and portfolio dashboard.
"""
from __future__ import annotations

from flask import Blueprint, Response, jsonify, session

from coopgest.access import require_project_permission
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.excel_export import generate_project_excel
from coopgest.services.donor_reports import generate_eu_prag_report, generate_usaid_report
from coopgest.services.reports import build_project_executive_report, build_portfolio_executive_report
from coopgest.services.iati_export import generate_iati_xml

bp = Blueprint("exports", __name__)


# ── Excel export ───────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:id>/export/excel", methods=["GET"])
@login_required
def export_excel(id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, id, "membro")
        if err:
            return err

        xlsx_bytes = generate_project_excel(conn, id)
        projeto = row_to_dict(
            conn.execute("SELECT nome FROM projetos WHERE id=?", (id,)).fetchone()
        )
        filename = f"projeto_{id}.xlsx"
        if projeto:
            safe_name = "".join(
                c if c.isalnum() or c in (" ", "-", "_") else "_"
                for c in (projeto.get("nome") or "projeto")
            ).strip().replace(" ", "_")
            filename = f"{safe_name}_{id}.xlsx"

        return Response(
            xlsx_bytes,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    finally:
        conn.close()


# ── EU PRAG donor report ──────────────────────────────────────────────────────

@bp.route("/api/projects/<int:id>/donor-report/eu-prag", methods=["GET"])
@login_required
def donor_report_eu_prag(id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, id, "membro")
        if err:
            return err

        report = build_project_executive_report(conn, id)
        if not report:
            return api_error("Projeto não encontrado", 404, "NOT_FOUND")

        pdf_bytes = generate_eu_prag_report(report, conn=conn)
        projeto_name = (report.get("projeto") or {}).get("nome", f"projeto_{id}")
        safe_name = "".join(
            c if c.isalnum() or c in (" ", "-", "_") else "_"
            for c in projeto_name
        ).strip().replace(" ", "_")
        filename = f"EU_PRAG_{safe_name}_{id}.pdf"

        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    finally:
        conn.close()


# ── USAID donor report ────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:id>/donor-report/usaid", methods=["GET"])
@login_required
def donor_report_usaid(id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, id, "membro")
        if err:
            return err

        report = build_project_executive_report(conn, id)
        if not report:
            return api_error("Projeto não encontrado", 404, "NOT_FOUND")

        pdf_bytes = generate_usaid_report(report, conn=conn)
        projeto_name = (report.get("projeto") or {}).get("nome", f"projeto_{id}")
        safe_name = "".join(
            c if c.isalnum() or c in (" ", "-", "_") else "_"
            for c in projeto_name
        ).strip().replace(" ", "_")
        filename = f"USAID_{safe_name}_{id}.pdf"

        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    finally:
        conn.close()


# ── IATI XML export ───────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:id>/export/iati", methods=["GET"])
@login_required
def export_iati(id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, id, "membro")
        if err:
            return err
        projeto = row_to_dict(conn.execute("SELECT * FROM projetos WHERE id=?", (id,)).fetchone() or {})
        if not projeto:
            return api_error("Projeto não encontrado", 404, "NOT_FOUND")
        xml_bytes = generate_iati_xml(conn, id)
        nome = projeto.get("nome", "projeto")
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in nome)
        return Response(xml_bytes, mimetype="application/xml",
                       headers={"Content-Disposition": f'attachment; filename="iati_{safe}.xml"'})
    finally:
        conn.close()


# ── Portfolio dashboard ───────────────────────────────────────────────────────

@bp.route("/api/portfolio/dashboard", methods=["GET"])
@login_required
def portfolio_dashboard():
    conn = get_db()
    try:
        user_id = session.get("user_id")
        papel = session.get("papel")

        if papel == "admin":
            projects = [
                row_to_dict(r)
                for r in conn.execute("SELECT * FROM projetos WHERE arquivado=0").fetchall()
            ]
        else:
            projects = [
                row_to_dict(r)
                for r in conn.execute(
                    """SELECT p.* FROM projetos p
                       JOIN projeto_membros pm ON pm.projeto_id = p.id
                       WHERE pm.user_id = ? AND p.arquivado = 0""",
                    (user_id,),
                ).fetchall()
            ]

        dashboard = build_portfolio_executive_report(conn, projects)
        return jsonify(dashboard)
    finally:
        conn.close()
