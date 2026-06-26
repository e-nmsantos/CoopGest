"""
IATI 2.03 XML export for CoopGest projects.
Uses stdlib xml.etree.ElementTree only — no extra dependencies.
"""
from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from xml.dom import minidom

# ── Constants ─────────────────────────────────────────────────────────────────

ESTADO_TO_IATI = {
    "Planeamento": "1",
    "Em curso": "2",
    "Concluído": "3",
    "Suspenso": "6",
}

COUNTRY_CODES: dict[str, str] = {
    "Portugal": "PT",
    "Angola": "AO",
    "Moçambique": "MZ",
    "Mozambique": "MZ",
    "Cabo Verde": "CV",
    "Guiné-Bissau": "GW",
    "São Tomé e Príncipe": "ST",
    "Timor-Leste": "TL",
    "Brasil": "BR",
    "Brazil": "BR",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _s(value) -> str:
    """Safely coerce a value to string, returning '' for None/falsy."""
    return str(value) if value is not None else ""


def _sub(parent: ET.Element, tag: str, text: str = "", **attribs) -> ET.Element:
    el = ET.SubElement(parent, tag, **attribs)
    if text:
        el.text = text
    return el


def _narrative(parent: ET.Element, text: str, lang: str = "pt") -> ET.Element:
    n = ET.SubElement(parent, "narrative", **{"xml:lang": lang})
    n.text = text or ""
    return n


def _pretty(elem: ET.Element) -> bytes:
    rough = ET.tostring(elem, encoding="unicode")
    return minidom.parseString(rough).toprettyxml(indent="  ", encoding="UTF-8")


def _resolve_country(pais: str | None) -> str | None:
    if not pais:
        return None
    if pais in COUNTRY_CODES:
        return COUNTRY_CODES[pais]
    # Fallback: first two chars uppercased
    code = pais.strip()[:2].upper()
    if code.isalpha():
        return code
    return None


# ── Main export function ──────────────────────────────────────────────────────

def generate_iati_xml(conn, projeto_id: int) -> bytes:
    """Generate IATI 2.03 XML for a single project. Returns UTF-8 encoded bytes."""

    # Fetch project
    projeto_row = conn.execute("SELECT * FROM projetos WHERE id=?", (projeto_id,)).fetchone()
    if not projeto_row:
        raise ValueError(f"Projeto {projeto_id} não encontrado")

    projeto = dict(projeto_row)

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    data_inicio = _s(projeto.get("data_inicio") or "")
    data_fim = _s(projeto.get("data_fim") or "")
    moeda = _s(projeto.get("moeda") or "EUR")
    estado_code = ESTADO_TO_IATI.get(_s(projeto.get("estado")), "2")
    org_ref = "PT-CoopGest"

    # Root element
    root = ET.Element("iati-activities", version="2.03", **{"generated-datetime": now_iso})

    # Activity
    activity_attrs: dict[str, str] = {
        "default-currency": moeda,
        "last-updated-datetime": now_iso,
        "xml:lang": "pt",
    }
    activity = ET.SubElement(root, "iati-activity", **activity_attrs)

    # Identifier
    _sub(activity, "iati-identifier", f"{org_ref}-{projeto_id}")

    # Reporting org
    reporting = _sub(activity, "reporting-org", ref=org_ref, type="21", **{"secondary-reporter": "0"})
    _narrative(reporting, "CoopGest")

    # Title
    title_el = _sub(activity, "title")
    _narrative(title_el, _s(projeto.get("nome")))

    # Description
    desc_el = _sub(activity, "description", type="1")
    _narrative(desc_el, _s(projeto.get("descricao") or projeto.get("objetivos") or ""))

    # Activity status
    _sub(activity, "activity-status", code=estado_code)

    # Activity dates
    if data_inicio:
        _sub(activity, "activity-date", type="1", **{"iso-date": data_inicio})
    if data_fim:
        _sub(activity, "activity-date", type="3", **{"iso-date": data_fim})

    # Partners
    partners = conn.execute(
        """SELECT p.nome FROM parceiros p
           JOIN projeto_parceiro pp ON pp.parceiro_id = p.id
           WHERE pp.projeto_id = ?""",
        (projeto_id,),
    ).fetchall()
    for partner_row in partners:
        part_el = _sub(activity, "participating-org", role="4", type="21")
        _narrative(part_el, _s(partner_row["nome"] if hasattr(partner_row, "__getitem__") else partner_row[0]))

    # Recipient country
    pais_code = _resolve_country(projeto.get("pais"))
    if pais_code:
        _sub(activity, "recipient-country", code=pais_code, percentage="100")

    # Budget — sum orcamento or use orcamento_total if available
    orcamento_total = projeto.get("orcamento_total") or projeto.get("orcamento")
    if orcamento_total is None:
        # Try to sum from orcamento table
        row = conn.execute(
            "SELECT COALESCE(SUM(valor_previsto), 0) AS total FROM orcamento WHERE projeto_id=?",
            (projeto_id,),
        ).fetchone()
        orcamento_total = row[0] if row else 0

    if orcamento_total:
        budget = _sub(activity, "budget", type="1", status="1")
        if data_inicio:
            _sub(budget, "period-start", **{"iso-date": data_inicio})
        if data_fim:
            _sub(budget, "period-end", **{"iso-date": data_fim})
        value_el = _sub(budget, "value", str(orcamento_total),
                        currency=moeda,
                        **{"value-date": data_inicio or now_iso[:10]})

    # Logframe results (Resultado / Impacto levels)
    logframe_rows = conn.execute(
        "SELECT * FROM impacto_quadro_logico WHERE projeto_id=? AND nivel IN ('Resultado', 'Impacto')",
        (projeto_id,),
    ).fetchall()
    for lf_row in logframe_rows:
        lf = dict(lf_row)
        result_el = _sub(activity, "result", type="1", **{"aggregation-status": "false"})
        r_title = _sub(result_el, "title")
        _narrative(r_title, _s(lf.get("resultado")))

        ind_el = _sub(result_el, "indicator", measure="5", ascending="true")
        i_title = _sub(ind_el, "title")
        _narrative(i_title, _s(lf.get("indicador")))

        # Baseline year from data_inicio or current year
        baseline_year = (data_inicio[:4] if len(data_inicio) >= 4 else str(datetime.now().year))
        _sub(ind_el, "baseline",
             year=baseline_year,
             value=_s(lf.get("baseline") or "0"))

        period_el = _sub(ind_el, "period")
        if data_inicio:
            _sub(period_el, "period-start", **{"iso-date": data_inicio})
        if data_fim:
            _sub(period_el, "period-end", **{"iso-date": data_fim})
        _sub(period_el, "target", value=_s(lf.get("meta") or "0"))
        _sub(period_el, "actual", value=_s(lf.get("valor_atual") or "0"))

    # Financial transactions (Despesa → expenditure, type code 4)
    transaction_rows = conn.execute(
        "SELECT * FROM movimentos_financeiros WHERE projeto_id=?",
        (projeto_id,),
    ).fetchall()
    for tx_row in transaction_rows:
        tx = dict(tx_row)
        tx_tipo = _s(tx.get("tipo", ""))
        if tx_tipo == "Despesa":
            tx_type_code = "4"   # Expenditure
        elif tx_tipo == "Receita":
            tx_type_code = "1"   # Incoming funds
        else:
            tx_type_code = "4"   # Default: expenditure

        tx_el = _sub(activity, "transaction")
        _sub(tx_el, "transaction-type", code=tx_type_code)
        tx_date = _s(tx.get("data_movimento") or now_iso[:10])
        _sub(tx_el, "transaction-date", **{"iso-date": tx_date})
        tx_moeda = _s(tx.get("moeda") or moeda)
        _sub(tx_el, "value", _s(tx.get("valor") or "0"),
             currency=tx_moeda,
             **{"value-date": tx_date})
        tx_desc = _s(tx.get("descricao") or "")
        if tx_desc:
            desc_tx = _sub(tx_el, "description")
            _narrative(desc_tx, tx_desc)

    return _pretty(root)
