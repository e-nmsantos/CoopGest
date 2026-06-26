"""
Donor-formatted PDF report generation using reportlab.
Supports EU PRAG Narrative Report and USAID Performance Report formats.
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

from coopgest.db import row_to_dict

# ── Brand colours (same as pdf_report.py) ──────────────────────────────────────
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

# ── EU colours ──────────────────────────────────────────────────────────────────
EU_BLUE = colors.HexColor("#003399")
EU_YELLOW = colors.HexColor("#FFCC00")


def _styles():
    return {
        "title": ParagraphStyle(
            "title", fontName="Helvetica-Bold", fontSize=16, textColor=WHITE,
            spaceAfter=4, leading=20, alignment=TA_CENTER,
        ),
        "title_dark": ParagraphStyle(
            "title_dark", fontName="Helvetica-Bold", fontSize=16, textColor=BLUE,
            spaceAfter=4, leading=20,
        ),
        "subtitle": ParagraphStyle(
            "subtitle", fontName="Helvetica", fontSize=10, textColor=GREY,
            spaceAfter=2,
        ),
        "section": ParagraphStyle(
            "section", fontName="Helvetica-Bold", fontSize=12, textColor=WHITE,
            spaceBefore=12, spaceAfter=6, leading=15,
        ),
        "section_dark": ParagraphStyle(
            "section_dark", fontName="Helvetica-Bold", fontSize=11, textColor=BLUE,
            spaceBefore=12, spaceAfter=6, leading=14,
        ),
        "body": ParagraphStyle(
            "body", fontName="Helvetica", fontSize=9, textColor=BLACK,
            spaceAfter=4, leading=13,
        ),
        "small": ParagraphStyle(
            "small", fontName="Helvetica", fontSize=8, textColor=GREY,
            spaceAfter=2,
        ),
        "label": ParagraphStyle(
            "label", fontName="Helvetica-Bold", fontSize=9, textColor=BLACK,
        ),
        "center": ParagraphStyle(
            "center", fontName="Helvetica", fontSize=9, alignment=TA_CENTER,
            textColor=BLACK,
        ),
        "checklist": ParagraphStyle(
            "checklist", fontName="Helvetica", fontSize=9, textColor=BLACK,
            spaceAfter=3, leftIndent=12, leading=13,
        ),
    }


def _section_banner(title: str, bg_color=BLUE) -> Table:
    """Full-width coloured banner for a section heading."""
    st = _styles()
    data = [[Paragraph(title, st["section"])]]
    t = Table(data, colWidths=["100%"])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_color),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def _kv_table(rows: list[tuple[str, str]]) -> Table:
    """Two-column key/value table with alternating rows."""
    st = _styles()
    data = [
        [Paragraph(f"<b>{k}</b>", st["label"]), Paragraph(str(v) if v is not None else "—", st["body"])]
        for k, v in rows
    ]
    t = Table(data, colWidths=["35%", "65%"])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [GREY_LIGHT, WHITE]),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def _generic_table(headers: list[str], rows: list[list], col_widths: list | None = None) -> Table:
    """Standard table with header row and data rows."""
    header_row = [Paragraph(f"<b>{h}</b>", ParagraphStyle(
        "th", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE,
    )) for h in headers]
    data_rows = []
    for row in rows:
        data_rows.append([
            Paragraph(str(cell) if cell is not None else "—", ParagraphStyle(
                "td", fontName="Helvetica", fontSize=8, textColor=BLACK, leading=11,
            ))
            for cell in row
        ])

    all_data = [header_row] + data_rows
    n_cols = len(headers)
    if col_widths is None:
        available = 17 * cm
        col_widths = [available / n_cols] * n_cols

    t = Table(all_data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    for i, _ in enumerate(data_rows, 1):
        if i % 2 == 0:
            style_cmds.append(("ROWBACKGROUNDS", (0, i), (-1, i), [GREY_LIGHT]))
    t.setStyle(TableStyle(style_cmds))
    return t


def _health_color(status: str):
    return {"Bom": GREEN, "Atenção": AMBER, "Crítico": RED, "Excelente": GREEN}.get(status, GREY)


def _health_bg(status: str):
    return {"Bom": GREEN_LIGHT, "Atenção": AMBER_LIGHT, "Crítico": RED_LIGHT, "Excelente": GREEN_LIGHT}.get(status, GREY_LIGHT)


# ── EU PRAG Report ──────────────────────────────────────────────────────────────

def generate_eu_prag_report(report: dict, conn=None) -> bytes:
    """
    Generate a EU PRAG Narrative Progress Report PDF.
    `report` is the dict returned by build_project_executive_report().
    """
    buf = io.BytesIO()
    projeto = report.get("projeto") or {}
    health = report.get("health") or {}
    finance = report.get("finance") or {}
    recs = report.get("recommendations") or []
    generated_at = report.get("generated_at", datetime.now().isoformat())[:10]
    projeto_id = projeto.get("id")

    # Fetch additional data via conn if available
    logframe_activities: list[dict] = []
    beneficiarios: list[dict] = []
    orcamento: list[dict] = []
    if conn is not None and projeto_id:
        logframe_activities = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM impacto_quadro_logico WHERE projeto_id=? AND nivel='Atividade' ORDER BY id",
                (projeto_id,),
            ).fetchall()
        ]
        beneficiarios = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM beneficiarios WHERE projeto_id=? AND arquivado=0 ORDER BY nome",
                (projeto_id,),
            ).fetchall()
        ]
        orcamento = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM orcamento WHERE projeto_id=? ORDER BY tipo, categoria",
                (projeto_id,),
            ).fetchall()
        ]

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"Relatório Narrativo PRAG — {projeto.get('nome', '')}",
        author="CoopGest",
    )
    st = _styles()
    story = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    cover_data = [[
        Paragraph("RELATÓRIO NARRATIVO DE PROGRESSO", ParagraphStyle(
            "cover_title", fontName="Helvetica-Bold", fontSize=18,
            textColor=EU_YELLOW, alignment=TA_CENTER, leading=22,
        )),
    ]]
    cover_t = Table(cover_data, colWidths=["100%"])
    cover_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), EU_BLUE),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
    ]))
    story.append(cover_t)
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        f"Formato PRAG da União Europeia &nbsp;|&nbsp; Gerado em: {generated_at}",
        st["subtitle"],
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=EU_BLUE, spaceAfter=8))

    # ── Section A: Identificação ────────────────────────────────────────────────
    story.append(_section_banner("A. Identificação do Projeto", EU_BLUE))
    story.append(Spacer(1, 0.2 * cm))
    story.append(_kv_table([
        ("Nome do Projeto", projeto.get("nome", "—")),
        ("Número de Referência", projeto.get("numero_referencia", projeto.get("referencia", "—"))),
        ("País/Região de Implementação", projeto.get("pais", "—")),
        ("Entidade Doadora", "União Europeia"),
        ("Período do Relatório", f"{projeto.get('data_inicio', '—')} — {projeto.get('data_fim', '—')}"),
        ("Valor Total do Contrato (EUR)", f"€ {finance.get('receitas_previstas', 0):,.2f}"),
        ("Estado do Projeto", projeto.get("estado", "—")),
    ]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section B: Resumo das Atividades ───────────────────────────────────────
    story.append(_section_banner("B. Resumo das Atividades", EU_BLUE))
    story.append(Spacer(1, 0.2 * cm))
    if logframe_activities:
        act_rows = [
            [
                a.get("resultado", ""),
                a.get("indicador", ""),
                a.get("estado", ""),
            ]
            for a in logframe_activities
        ]
        story.append(_generic_table(
            ["Atividade / Resultado", "Indicador", "Estado"],
            act_rows,
            col_widths=[8 * cm, 5.5 * cm, 3.5 * cm],
        ))
    else:
        story.append(Paragraph("Nenhuma atividade registada no Quadro Lógico.", st["body"]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section C: Grupos-Alvo e Beneficiários ──────────────────────────────────
    story.append(_section_banner("C. Grupos-Alvo e Beneficiários", EU_BLUE))
    story.append(Spacer(1, 0.2 * cm))
    total_bens = sum(int(b.get("numero") or 1) for b in beneficiarios)
    story.append(Paragraph(f"Total de beneficiários diretos registados: <b>{total_bens}</b>", st["body"]))
    if beneficiarios:
        ben_rows = [
            [b.get("nome", ""), b.get("tipo", ""), str(b.get("numero", 1)), b.get("localizacao", "")]
            for b in beneficiarios[:20]
        ]
        story.append(_generic_table(
            ["Nome / Grupo", "Tipo", "Nº", "Localização"],
            ben_rows,
            col_widths=[6.5 * cm, 3.5 * cm, 2 * cm, 5 * cm],
        ))
        if len(beneficiarios) > 20:
            story.append(Paragraph(f"... e mais {len(beneficiarios) - 20} beneficiário(s).", st["small"]))
    else:
        story.append(Paragraph("Nenhum beneficiário registado.", st["body"]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section D: Visibilidade ─────────────────────────────────────────────────
    story.append(_section_banner("D. Visibilidade", EU_BLUE))
    story.append(Spacer(1, 0.2 * cm))
    visibility_items = [
        "[ ] Logótipo da União Europeia visível em todos os materiais de comunicação",
        "[ ] Referência ao cofinanciamento da UE incluída em comunicados de imprensa",
        "[ ] Placas e banners de visibilidade instalados nos locais de implementação",
        "[ ] Website ou canais digitais mencionam o apoio da UE",
        "[ ] Relatórios e publicações incluem declaração de cofinanciamento",
    ]
    for item in visibility_items:
        story.append(Paragraph(item, st["checklist"]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section E: Avaliação da Implementação ──────────────────────────────────
    story.append(_section_banner("E. Avaliação da Implementação", EU_BLUE))
    story.append(Spacer(1, 0.2 * cm))
    score = health.get("score", 0)
    status = health.get("status", "—")
    hc = _health_color(status)
    hbg = _health_bg(status)
    banner_data = [[
        Paragraph(f"<b>Saúde do Projeto: {status}</b>", ParagraphStyle(
            "hb_eu", fontName="Helvetica-Bold", fontSize=11, textColor=hc,
        )),
        Paragraph(f"<b>{score}/100</b>", ParagraphStyle(
            "hbs_eu", fontName="Helvetica-Bold", fontSize=16, textColor=hc,
            alignment=TA_RIGHT,
        )),
    ]]
    bt = Table(banner_data, colWidths=["75%", "25%"])
    bt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), hbg),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(bt)
    story.append(Spacer(1, 0.3 * cm))
    top_recs = recs[:3]
    if top_recs:
        story.append(Paragraph("<b>Principais recomendações:</b>", st["label"]))
        for i, rec in enumerate(top_recs, 1):
            story.append(Paragraph(
                f"{i}. <b>{rec.get('title', '')}</b> — {rec.get('description', '')}",
                st["body"],
            ))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section F: Relatório Financeiro Resumido ───────────────────────────────
    story.append(_section_banner("F. Relatório Financeiro Resumido", EU_BLUE))
    story.append(Spacer(1, 0.2 * cm))
    fin_rows = []
    if orcamento:
        for o in orcamento:
            previsto = float(o.get("valor_previsto") or 0)
            real = float(o.get("valor_real") or 0)
            exec_pct = f"{(real / previsto * 100):.1f}%" if previsto else "—"
            fin_rows.append([
                o.get("tipo", ""),
                o.get("categoria", ""),
                o.get("descricao", ""),
                f"€ {previsto:,.2f}",
                f"€ {real:,.2f}",
                exec_pct,
            ])
    else:
        # Fallback to finance summary
        fin_rows = [
            ["Receitas", "Total", "Previsto vs. Real",
             f"€ {finance.get('receitas_previstas', 0):,.2f}",
             f"€ {finance.get('receitas_reais', 0):,.2f}",
             f"{finance.get('execucao_financeira', 0):.1f}%"],
            ["Despesas", "Total", "Previsto vs. Real",
             f"€ {finance.get('despesas_previstas', 0):,.2f}",
             f"€ {finance.get('despesas_reais', 0):,.2f}",
             f"{finance.get('despesa_execucao', 0):.1f}%"],
        ]
    story.append(_generic_table(
        ["Tipo", "Categoria", "Descrição", "Previsto (EUR)", "Real (EUR)", "Execução"],
        fin_rows,
        col_widths=[2.5 * cm, 2.5 * cm, 4 * cm, 3 * cm, 3 * cm, 2 * cm],
    ))
    story.append(Spacer(1, 0.6 * cm))

    # ── Footer ─────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=EU_BLUE, spaceBefore=10))
    story.append(Paragraph(
        "Relatório gerado por CoopGest | Formato PRAG da UE",
        st["small"],
    ))

    doc.build(story)
    return buf.getvalue()


# ── USAID Performance Report ────────────────────────────────────────────────────

def generate_usaid_report(report: dict, conn=None) -> bytes:
    """
    Generate a USAID Performance Progress Report PDF.
    `report` is the dict returned by build_project_executive_report().
    """
    buf = io.BytesIO()
    projeto = report.get("projeto") or {}
    health = report.get("health") or {}
    finance = report.get("finance") or {}
    recs = report.get("recommendations") or []
    generated_at = report.get("generated_at", datetime.now().isoformat())[:10]
    projeto_id = projeto.get("id")

    # Fetch additional data via conn if available
    logframe: list[dict] = []
    beneficiarios: list[dict] = []
    riscos: list[dict] = []
    licoes: list[dict] = []
    if conn is not None and projeto_id:
        logframe = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM impacto_quadro_logico WHERE projeto_id=? ORDER BY nivel, id",
                (projeto_id,),
            ).fetchall()
        ]
        beneficiarios = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM beneficiarios WHERE projeto_id=? AND arquivado=0 ORDER BY nome",
                (projeto_id,),
            ).fetchall()
        ]
        riscos = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM riscos WHERE projeto_id=? ORDER BY criado_em",
                (projeto_id,),
            ).fetchall()
        ]
        licoes = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM licoes_aprendidas WHERE projeto_id=? ORDER BY criado_em DESC",
                (projeto_id,),
            ).fetchall()
        ]

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"USAID Performance Report — {projeto.get('nome', '')}",
        author="CoopGest",
    )
    st = _styles()
    story = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    cover_data = [[
        Paragraph("PERFORMANCE PROGRESS REPORT", ParagraphStyle(
            "usaid_title", fontName="Helvetica-Bold", fontSize=18,
            textColor=WHITE, alignment=TA_CENTER, leading=22,
        )),
    ]]
    cover_t = Table(cover_data, colWidths=["100%"])
    cover_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
    ]))
    story.append(cover_t)
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        f"USAID Standard Performance Report &nbsp;|&nbsp; Generated: {generated_at}",
        st["subtitle"],
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=BLUE, spaceAfter=8))

    # ── Section 1: Project Information ─────────────────────────────────────────
    story.append(_section_banner("1. Project Information", BLUE))
    story.append(Spacer(1, 0.2 * cm))
    story.append(_kv_table([
        ("Project Name", projeto.get("nome", "—")),
        ("Country / Region", projeto.get("pais", "—")),
        ("Implementing Partner", projeto.get("parceiro_lider", "—")),
        ("Reporting Period", f"{projeto.get('data_inicio', '—')} — {projeto.get('data_fim', '—')}"),
        ("Project Status", projeto.get("estado", "—")),
        ("Total Budget (EUR)", f"€ {finance.get('receitas_previstas', 0):,.2f}"),
    ]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section 2: Progress Toward Results ─────────────────────────────────────
    story.append(_section_banner("2. Progress Toward Results", BLUE))
    story.append(Spacer(1, 0.2 * cm))
    if logframe:
        lf_rows = []
        for item in logframe:
            baseline = float(item.get("baseline") or 0)
            target = float(item.get("meta") or 0)
            actual = float(item.get("valor_atual") or 0)
            if target > baseline:
                pct = round(((actual - baseline) / (target - baseline)) * 100, 1)
            elif target > 0:
                pct = round((actual / target) * 100, 1)
            else:
                pct = 0
            lf_rows.append([
                f"[{item.get('nivel', '')}] {item.get('indicador', '')}",
                str(baseline),
                str(target),
                str(actual),
                f"{pct}%",
            ])
        story.append(_generic_table(
            ["Indicator", "Baseline", "Target", "Actual", "% Achievement"],
            lf_rows,
            col_widths=[7.5 * cm, 2.2 * cm, 2.2 * cm, 2.2 * cm, 2.9 * cm],
        ))
    else:
        story.append(Paragraph("No indicators recorded in the logical framework.", st["body"]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section 3: Beneficiaries ─────────────────────────────────────────────
    story.append(_section_banner("3. Beneficiaries", BLUE))
    story.append(Spacer(1, 0.2 * cm))
    total_bens = sum(int(b.get("numero") or 1) for b in beneficiarios)
    story.append(Paragraph(f"<b>Total direct beneficiaries:</b> {total_bens}", st["body"]))
    if beneficiarios:
        ben_rows = [
            [b.get("nome", ""), b.get("tipo", ""), str(b.get("numero", 1)), b.get("localizacao", "")]
            for b in beneficiarios[:20]
        ]
        story.append(_generic_table(
            ["Name / Group", "Type", "Number", "Location"],
            ben_rows,
            col_widths=[6.5 * cm, 3.5 * cm, 2 * cm, 5 * cm],
        ))
        if len(beneficiarios) > 20:
            story.append(Paragraph(f"... and {len(beneficiarios) - 20} more beneficiaries.", st["small"]))
    else:
        story.append(Paragraph("No beneficiaries recorded.", st["body"]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section 4: Challenges and Mitigation ────────────────────────────────────
    story.append(_section_banner("4. Challenges and Mitigation", BLUE))
    story.append(Spacer(1, 0.2 * cm))
    if riscos:
        risk_rows = [
            [
                r.get("descricao", ""),
                r.get("probabilidade", ""),
                r.get("impacto", ""),
                r.get("estado", ""),
                r.get("mitigacao", ""),
            ]
            for r in riscos
        ]
        story.append(_generic_table(
            ["Risk / Challenge", "Probability", "Impact", "Status", "Mitigation"],
            risk_rows,
            col_widths=[5.5 * cm, 2.5 * cm, 2 * cm, 2.5 * cm, 4.5 * cm],
        ))
    else:
        story.append(Paragraph("No risks recorded.", st["body"]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Section 5: Lessons Learned ───────────────────────────────────────────
    story.append(_section_banner("5. Lessons Learned", BLUE))
    story.append(Spacer(1, 0.2 * cm))
    if licoes:
        lesson_rows = [
            [
                l.get("titulo", ""),
                l.get("tipo", ""),
                l.get("area", ""),
                l.get("impacto", ""),
                l.get("recomendacao", ""),
            ]
            for l in licoes[:15]
        ]
        story.append(_generic_table(
            ["Title", "Type", "Area", "Impact", "Recommendation"],
            lesson_rows,
            col_widths=[4 * cm, 2.5 * cm, 2.5 * cm, 2 * cm, 6 * cm],
        ))
    else:
        story.append(Paragraph("No lessons learned recorded.", st["body"]))
    story.append(Spacer(1, 0.6 * cm))

    # ── Footer ─────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=GREY, spaceBefore=10))
    story.append(Paragraph(
        "Generated by CoopGest | USAID Standard Performance Report",
        st["small"],
    ))

    doc.build(story)
    return buf.getvalue()
