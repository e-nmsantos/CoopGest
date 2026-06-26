"""
PDF report generation using reportlab.
Produces a branded, donor-ready executive report for a cooperation project.
"""
from __future__ import annotations

import io
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Brand colours ─────────────────────────────────────────────────────────────
BLUE = colors.HexColor("#1e40af")
BLUE_LIGHT = colors.HexColor("#dbeafe")
GREEN = colors.HexColor("#15803d")
GREEN_LIGHT = colors.HexColor("#dcfce7")
AMBER = colors.HexColor("#b45309")
AMBER_LIGHT = colors.HexColor("#fef3c7")
RED = colors.HexColor("#b91c1c")
RED_LIGHT = colors.HexColor("#fee2e2")
GREY = colors.HexColor("#6b7280")
GREY_LIGHT = colors.HexColor("#f3f4f6")
BLACK = colors.HexColor("#111827")
WHITE = colors.white


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title", fontName="Helvetica-Bold", fontSize=22, textColor=BLUE,
            spaceAfter=4, leading=26,
        ),
        "subtitle": ParagraphStyle(
            "subtitle", fontName="Helvetica", fontSize=11, textColor=GREY,
            spaceAfter=2,
        ),
        "section": ParagraphStyle(
            "section", fontName="Helvetica-Bold", fontSize=13, textColor=BLUE,
            spaceBefore=14, spaceAfter=6, leading=16,
        ),
        "body": ParagraphStyle(
            "body", fontName="Helvetica", fontSize=10, textColor=BLACK,
            spaceAfter=4, leading=14,
        ),
        "small": ParagraphStyle(
            "small", fontName="Helvetica", fontSize=8, textColor=GREY,
            spaceAfter=2,
        ),
        "label": ParagraphStyle(
            "label", fontName="Helvetica-Bold", fontSize=9, textColor=BLACK,
        ),
        "right": ParagraphStyle(
            "right", fontName="Helvetica", fontSize=9, alignment=TA_RIGHT,
            textColor=GREY,
        ),
        "center": ParagraphStyle(
            "center", fontName="Helvetica", fontSize=10, alignment=TA_CENTER,
            textColor=BLACK,
        ),
        "rec": ParagraphStyle(
            "rec", fontName="Helvetica", fontSize=9, textColor=BLACK,
            spaceAfter=3, leftIndent=10, leading=13,
        ),
    }


def _health_color(status: str):
    return {
        "Bom": GREEN,
        "Atenção": AMBER,
        "Crítico": RED,
    }.get(status, GREY)


def _health_bg(status: str):
    return {
        "Bom": GREEN_LIGHT,
        "Atenção": AMBER_LIGHT,
        "Crítico": RED_LIGHT,
    }.get(status, GREY_LIGHT)


def _progress_bar_table(percent: float, width: float = 12 * cm) -> Table:
    """Inline progress bar as a two-column table."""
    filled = max(0.0, min(1.0, percent / 100.0))
    empty = 1.0 - filled
    color = GREEN if percent >= 75 else (AMBER if percent >= 40 else RED)
    data = [["", ""]]
    t = Table(data, colWidths=[width * filled or 0.001, width * empty or 0.001], rowHeights=[10])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), color),
        ("BACKGROUND", (1, 0), (1, 0), GREY_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]))
    return t


def generate_project_pdf(report: dict[str, Any]) -> bytes:
    """
    Convert an executive report dict (from build_project_executive_report) to PDF bytes.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"Relatório Executivo — {report.get('projeto', {}).get('nome', '')}",
        author="CoopGest",
    )

    st = _styles()
    story = []

    projeto = report.get("projeto") or {}
    health = report.get("health") or {}
    summary = report.get("summary") or {}
    finance = report.get("finance") or {}
    recs = report.get("recommendations") or []
    highlights = report.get("highlights") or []
    generated_at = report.get("generated_at", datetime.now().isoformat())[:10]

    # ── Cover header ─────────────────────────────────────────────────────────
    story.append(Paragraph("CoopGest", st["subtitle"]))
    story.append(Paragraph("Relatório Executivo de Projeto", st["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=2, color=BLUE, spaceAfter=8))
    story.append(Paragraph(projeto.get("nome", "—"), st["title"]))
    story.append(Paragraph(
        f"Gerado em: {generated_at} &nbsp;|&nbsp; Estado: {projeto.get('estado', '—')}",
        st["subtitle"],
    ))
    story.append(Spacer(1, 0.4 * cm))

    # ── Health score banner ───────────────────────────────────────────────────
    score = health.get("score", 0)
    status = health.get("status", "—")
    hc = _health_color(status)
    hbg = _health_bg(status)

    banner_data = [[
        Paragraph(f"<b>Saúde do Projeto: {status}</b>", ParagraphStyle(
            "hb", fontName="Helvetica-Bold", fontSize=12, textColor=hc,
        )),
        Paragraph(f"<b>{score}/100</b>", ParagraphStyle(
            "hbs", fontName="Helvetica-Bold", fontSize=18, textColor=hc,
            alignment=TA_RIGHT,
        )),
    ]]
    bt = Table(banner_data, colWidths=["75%", "25%"])
    bt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), hbg),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(bt)
    story.append(Spacer(1, 0.5 * cm))

    # ── Project metadata ──────────────────────────────────────────────────────
    meta_rows = [
        ["Início", projeto.get("data_inicio", "—"), "Fim", projeto.get("data_fim", "—")],
        ["Parceiro líder", projeto.get("parceiro_lider", "—"), "País", projeto.get("pais", "—")],
        ["Orçamento total", f"€ {projeto.get('orcamento_total', 0):,.2f}", "Área temática", projeto.get("area_tematica", "—")],
    ]
    mt = Table(meta_rows, colWidths=["20%", "30%", "20%", "30%"])
    mt.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (-1, -1), BLACK),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [GREY_LIGHT, WHITE]),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
    ]))
    story.append(mt)
    story.append(Spacer(1, 0.4 * cm))

    # ── Summary KPIs ─────────────────────────────────────────────────────────
    story.append(Paragraph("Resumo de Progresso", st["section"]))

    kpi_labels = [
        ("Tarefas concluídas", f"{summary.get('tarefas_concluidas', 0)}/{summary.get('tarefas_total', 0)}"),
        ("Marcos concluídos", f"{summary.get('marcos_concluidos', 0)}/{summary.get('marcos_total', 0)}"),
        ("Riscos ativos", str(summary.get("riscos_ativos", 0))),
        ("Beneficiários", str(summary.get("beneficiarios_total", 0))),
    ]
    kpi_data = [[Paragraph(f"<b>{v}</b>", ParagraphStyle(
        "kv", fontName="Helvetica-Bold", fontSize=16, textColor=BLUE, alignment=TA_CENTER,
    )) for _, v in kpi_labels],
        [Paragraph(l, ParagraphStyle(
            "kl", fontName="Helvetica", fontSize=8, textColor=GREY, alignment=TA_CENTER,
        )) for l, _ in kpi_labels]]
    kt = Table(kpi_data, colWidths=["25%", "25%", "25%", "25%"])
    kt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (- 1, 0), 10),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BLUE),
        ("BOX", (0, 0), (-1, -1), 0.5, BLUE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(kt)
    story.append(Spacer(1, 0.4 * cm))

    # ── Financial execution ───────────────────────────────────────────────────
    story.append(Paragraph("Execução Financeira", st["section"]))
    f_prev = finance.get("previsto", 0) or 0
    f_real = finance.get("real", 0) or 0
    f_pct = finance.get("percent", 0) or 0

    fin_rows = [
        [Paragraph("<b>Orçamento previsto</b>", st["label"]),
         Paragraph(f"€ {f_prev:,.2f}", st["body"])],
        [Paragraph("<b>Despesas reais</b>", st["label"]),
         Paragraph(f"€ {f_real:,.2f}", st["body"])],
        [Paragraph("<b>Taxa de execução</b>", st["label"]),
         Paragraph(f"{f_pct:.1f}%", ParagraphStyle(
             "pct", fontName="Helvetica-Bold", fontSize=10,
             textColor=GREEN if f_pct >= 75 else (AMBER if f_pct >= 40 else RED),
         ))],
    ]
    ft = Table(fin_rows, colWidths=["40%", "60%"])
    ft.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [GREY_LIGHT, WHITE]),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
    ]))
    story.append(ft)
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(f"Progresso financeiro: {f_pct:.1f}%", st["small"]))
    story.append(_progress_bar_table(f_pct))
    story.append(Spacer(1, 0.4 * cm))

    # ── Highlights ────────────────────────────────────────────────────────────
    # highlights can be a dict of lists (tarefas_atrasadas, milestones_proximos, riscos_altos)
    # or a flat list
    hl_items: list[str] = []
    if isinstance(highlights, dict):
        for row in (highlights.get("tarefas_atrasadas") or []):
            t = row.get("title") or row.get("nome") or str(row) if isinstance(row, dict) else str(row)
            hl_items.append(f"! Tarefa atrasada: {t}")
        for row in (highlights.get("milestones_proximos") or []):
            t = row.get("titulo") or row.get("nome") or str(row) if isinstance(row, dict) else str(row)
            hl_items.append(f"• Marco próximo: {t}")
        for row in (highlights.get("riscos_altos") or []):
            t = row.get("descricao") or str(row) if isinstance(row, dict) else str(row)
            hl_items.append(f"! Risco alto: {t}")
    elif isinstance(highlights, list):
        for hl in highlights:
            if isinstance(hl, dict):
                icon = "✓" if hl.get("type") == "positive" else ("!" if hl.get("type") == "warning" else "•")
                hl_items.append(f"{icon} {hl.get('text', '')}")
            else:
                hl_items.append(f"• {hl}")
    if hl_items:
        story.append(Paragraph("Destaques", st["section"]))
        for item in hl_items:
            story.append(Paragraph(item, st["body"]))
        story.append(Spacer(1, 0.3 * cm))

    # ── Recommendations ───────────────────────────────────────────────────────
    if recs:
        story.append(Paragraph("Recomendações", st["section"]))
        for i, rec in enumerate(recs, 1):
            story.append(Paragraph(
                f"<b>{i}. {rec.get('title', '')}</b>",
                st["label"],
            ))
            if rec.get("description"):
                story.append(Paragraph(rec["description"], st["rec"]))
        story.append(Spacer(1, 0.3 * cm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=GREY, spaceBefore=12))
    story.append(Paragraph(
        f"CoopGest — Gestão de Projetos de Cooperação &nbsp;|&nbsp; Gerado em {generated_at}",
        st["small"],
    ))

    doc.build(story)
    return buf.getvalue()
