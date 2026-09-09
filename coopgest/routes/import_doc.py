"""Parse a project document (PDF / TXT / JSON) and extract form fields.
Also handles full template import (coopgest-template JSON format).
"""
from __future__ import annotations

import os
import re
from datetime import date, timedelta

from flask import Blueprint, current_app, jsonify, request, session

from coopgest.db import get_db
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("import_doc", __name__)

_ALLOWED_EXT = {".pdf", ".txt", ".json"}
_MAX_MB = 20


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def _extract_text_pdf(file_bytes: bytes) -> str:
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)
    except ImportError:
        raise ValueError("PyMuPDF não está instalado (pip install pymupdf)")
    except Exception as exc:
        raise ValueError(f"Erro ao ler PDF: {exc}") from exc


# ---------------------------------------------------------------------------
# Field extraction helpers
# ---------------------------------------------------------------------------

def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


_THESIS_NOISE = re.compile(
    r"trabalho\s+final|disserta[çc][aã]o|tese|mestrado|licenciatura|nuno|ana\s+oliveira|docente",
    re.IGNORECASE,
)


def _extract_name(lines: list[str]) -> str | None:
    # 1. Explicit "Designação:" / "Título:" label
    for line in lines:
        m = re.search(r"(?:designa[çc][aã]o|t[íi]tulo)\s*[:\-]\s*(.+)", line, re.IGNORECASE)
        if m:
            v = _clean(m.group(1))
            if len(v) > 5 and not _THESIS_NOISE.search(v):
                return v

    # 2. UPPERCASE "PROJETO NAME" on cover page — combine with subtitle on next line
    for i, line in enumerate(lines[:15]):
        v = _clean(line)
        if re.match(r"^PROJETO\s+\w", v) and len(v) > 8:
            if i + 1 < len(lines):
                nxt = _clean(lines[i + 1])
                if (
                    len(nxt) > 10
                    and not _THESIS_NOISE.search(nxt)
                    and not re.match(r"^(nuno|ana|paulo|lisboa|\d)", nxt, re.IGNORECASE)
                ):
                    return v + " — " + nxt
            return v

    # 3. Mixed-case line starting with "Projeto" — skip thesis-noise variants
    for line in lines[:30]:
        v = _clean(line)
        if re.match(r"^[Pp]rojeto\b.{5,}", v) and len(v) > 10 and not _THESIS_NOISE.search(v):
            return v

    # 4. First substantive line in the first 20 (skipping numbers, page refs)
    for line in lines[:20]:
        v = _clean(line)
        if (
            len(v) > 15
            and not re.match(r"^\d", v)
            and "pág" not in v.lower()
            and "page" not in v.lower()
        ):
            return v

    return None


def _extract_budget(text: str) -> float | None:
    patterns = [
        r"or[çc]amento\s+(?:total|global|previsto)\s*:?\s*([\d\s.,]+)\s*(EUR|USD|GBP|AOA|€|\$)",
        r"valor\s+(?:total|global)\s*:?\s*([\d\s.,]+)\s*(EUR|USD|GBP|AOA|€|\$)",
        r"([\d\s.,]+)\s*(EUR|USD|GBP|AOA|€|\$)",
        r"(EUR|USD|GBP|AOA|€|\$)\s*([\d\s.,]+)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if not m:
            continue
        g = m.groups()
        # Determine which group has the number
        num_str = g[0] if re.search(r"\d", g[0]) else g[1]
        num_str = re.sub(r"\s", "", num_str)
        # European format 500.000 → 500000
        if re.match(r"^\d{1,3}(\.\d{3})+$", num_str):
            num_str = num_str.replace(".", "")
        # US format 500,000 → 500000
        elif re.match(r"^\d{1,3}(,\d{3})+$", num_str):
            num_str = num_str.replace(",", "")
        else:
            num_str = num_str.replace(",", ".").rstrip(".")
        try:
            v = float(num_str)
            if v >= 1000:  # ignore tiny amounts
                return v
        except ValueError:
            pass
    return None


def _extract_duration_months(text: str) -> int | None:
    patterns = [
        (r"dura[çc][aã]o\s*(?:do\s+projeto\s*)?:?\s*(\d+)\s*mes(?:es)?", 1),
        (r"per[íi]odo\s+de\s+(\d+)\s*mes(?:es)?", 1),
        (r"(\d+)\s*mes(?:es?)\s+de\s+dura[çc][aã]o", 1),
        (r"prazo\s+(?:total\s+)?(?:de\s+)?(\d+)\s*mes(?:es)?", 1),
        (r"(\d+)\s*months?\s+(?:duration|project)", 1),
        (r"dura[çc][aã]o\s*:?\s*(\d+)\s*ano[s]?", 12),
        (r"(\d+)\s*ano[s]?\s+de\s+dura[çc][aã]o", 12),
    ]
    for pat, multiplier in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            n = int(m.group(1)) * multiplier
            if 1 <= n <= 120:
                return n
    return None


def _extract_dates(text: str) -> tuple[str | None, str | None]:
    start, end = None, None
    # ISO date YYYY-MM-DD
    iso = re.findall(r"\b(20\d{2}-\d{2}-\d{2})\b", text)
    if len(iso) >= 2:
        return iso[0], iso[1]
    # DD/MM/YYYY or DD-MM-YYYY
    dmy = re.findall(r"\b(\d{1,2}[/\-]\d{1,2}[/\-]20\d{2})\b", text)
    if dmy:
        def to_iso(d: str) -> str:
            sep = "/" if "/" in d else "-"
            dd, mm, yyyy = d.split(sep)
            return f"{yyyy}-{mm.zfill(2)}-{dd.zfill(2)}"
        start = to_iso(dmy[0])
        if len(dmy) >= 2:
            end = to_iso(dmy[1])
    return start, end


def _extract_objective(text: str) -> str | None:
    patterns = [
        r"objetivo\s+geral\s*[:\-]\s*\n*(.{30,}?)(?:\n{2,}|\Z)",
        r"3\.\d+\s+objetivo\s+geral\s*\n+(.{30,}?)(?:\n{2,}|\Z)",
        r"objetivo\s+(?:principal|do\s+projeto)\s*[:\-]\s*\n*(.{30,}?)(?:\n{2,}|\Z)",
        r"prop[oó]sito\s*[:\-]\s*\n*(.{30,}?)(?:\n{2,}|\Z)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE | re.DOTALL)
        if m:
            v = _clean(m.group(1))
            if len(v) > 20:
                return v[:600]
    return None


def _extract_description(text: str) -> str | None:
    patterns = [
        r"resumo\s+executivo\s*[:\-]?\s*\n+(.{50,}?)(?:\n{2,}|\Z)",
        r"(?:^|\n)resumo\s*[:\-]\s*\n*(.{50,}?)(?:\n{2,}|\Z)",
        r"mem[oó]ria\s+descritiva\s*[:\-]?\s*\n+(.{50,}?)(?:\n{2,}|\Z)",
        r"abstract\s*[:\-]?\s*\n*(.{50,}?)(?:\n{2,}|\Z)",
        r"introdu[çc][aã]o\s*\n+(.{80,}?)(?:\n{2,}|\Z)",
        r"contexto\s+e\s+justifica[çc][aã]o\s*\n+(.{50,}?)(?:\n{2,}|\Z)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE | re.DOTALL)
        if m:
            v = _clean(m.group(1))
            if len(v) > 30:
                return v[:900]
    return None


# ---------------------------------------------------------------------------
# Main parser
# ---------------------------------------------------------------------------

def _parse_fields(text: str) -> dict:
    lines = [l for l in text.split("\n") if _clean(l)]

    name = _extract_name(lines)
    objective = _extract_objective(text)
    description = _extract_description(text)
    budget = _extract_budget(text)
    duration = _extract_duration_months(text)
    start_date, end_date = _extract_dates(text)

    # Fall back to today + duration when no explicit dates found
    if not start_date and duration:
        today = date.today()
        start_date = today.isoformat()
        end_date = (today + timedelta(days=30 * duration)).isoformat()

    fields: dict = {}
    if name:
        fields["name"] = name
    if description:
        fields["description"] = description
    if objective:
        fields["objectives"] = objective
    if start_date:
        fields["startDate"] = start_date
    if end_date:
        fields["endDate"] = end_date
    if budget:
        fields["budget"] = str(int(budget)) if budget == int(budget) else str(budget)

    return fields


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@bp.route("/api/projects/parse-document", methods=["POST"])
@login_required
def api_parse_document():
    if "file" not in request.files:
        return api_error("Ficheiro em falta", 400, "VALIDATION_ERROR")

    f = request.files["file"]
    filename = (f.filename or "").strip()
    if not filename:
        return api_error("Nome de ficheiro inválido", 400, "VALIDATION_ERROR")

    ext = os.path.splitext(filename.lower())[1]
    if ext not in _ALLOWED_EXT:
        return api_error(
            "Tipo não suportado. Use PDF, TXT ou JSON.", 400, "VALIDATION_ERROR"
        )

    file_bytes = f.read()
    if len(file_bytes) > _MAX_MB * 1024 * 1024:
        return api_error(f"Ficheiro demasiado grande (máx {_MAX_MB} MB)", 413, "TOO_LARGE")

    try:
        if ext == ".pdf":
            text = _extract_text_pdf(file_bytes)
        elif ext == ".json":
            import json
            data = json.loads(file_bytes.decode("utf-8"))
            # Accept a plain project-shaped JSON
            mapped = {
                "name": data.get("nome") or data.get("name", ""),
                "description": data.get("descricao") or data.get("description", ""),
                "objectives": data.get("objetivos") or data.get("objectives", ""),
                "startDate": data.get("data_inicio") or data.get("startDate", ""),
                "endDate": data.get("data_fim") or data.get("endDate", ""),
                "budget": str(data.get("orcamento_total") or data.get("budget", "")),
            }
            return jsonify({"fields": {k: v for k, v in mapped.items() if v}, "source": "json"})
        else:
            text = file_bytes.decode("utf-8", errors="ignore")

        fields = _parse_fields(text)
        return jsonify({"fields": fields, "source": "parsed"})

    except ValueError as exc:
        return api_error(str(exc), 422, "PARSE_ERROR")
    except Exception as exc:
        return api_error(f"Erro interno ao processar ficheiro: {exc}", 500, "INTERNAL_ERROR")


# ---------------------------------------------------------------------------
# Full template import — creates project + all linked data in one shot
# ---------------------------------------------------------------------------

_VALID_CRITERIOS = {"Relevância", "Coerência", "Eficácia", "Eficiência", "Impacto", "Sustentabilidade"}
_VALID_NIVEIS = {"Impacto", "Resultado", "Produção", "Atividade"}


def _str(v, default: str = "") -> str:
    return str(v).strip() if v is not None else default


def _num(v, default: float = 0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def import_coopgest_template(db, user_id: int, data: dict) -> tuple[int, str, dict[str, int]]:
    """
    Parses a coopgest-template dictionary and inserts all elements into the DB.
    Does not commit or rollback — caller controls transaction.
    """
    counts: dict[str, int] = {}

    # ------------------------------------------------------------------
    # 1. Projeto
    # ------------------------------------------------------------------
    p = data.get("projeto") or {}
    nome = _str(p.get("nome") or p.get("name")) or "Projeto importado"
    # ODS: accept list [4,8,16] or string "4,8,16"
    ods_raw = p.get("ods") or p.get("alinhamento_ods") or \
              data.get("ficha_identificacao", {}).get("alinhamento_ods", "")
    if isinstance(ods_raw, list):
        ods_str = ",".join(str(x) for x in ods_raw)
    else:
        ods_str = _str(ods_raw)
    localizacao = _str(p.get("localizacao") or
                       data.get("ficha_identificacao", {}).get("localizacao", {}).get("regiao") or "")
    entidade = _str(p.get("entidade_proponente") or
                    data.get("ficha_identificacao", {}).get("entidade_proponente") or "")
    cur = db.execute(
        """INSERT INTO projetos (nome, descricao, objetivos, data_inicio, data_fim, estado,
                                localizacao, entidade_proponente, ods)
           VALUES (?, ?, ?, ?, ?, 'Em curso', ?, ?, ?)""",
        (
            nome,
            _str(p.get("descricao") or p.get("description")),
            _str(p.get("objetivos") or p.get("objectives")),
            _str(p.get("data_inicio") or p.get("startDate")),
            _str(p.get("data_fim") or p.get("endDate")),
            localizacao,
            entidade,
            ods_str,
        ),
    )
    pid = cur.lastrowid

    # Add creator as gestor
    db.execute(
        "INSERT INTO projeto_membros (projeto_id, user_id, papel) VALUES (?, ?, 'gestor')",
        (pid, user_id),
    )

    # ------------------------------------------------------------------
    # 2. Parceiros
    # ------------------------------------------------------------------
    count_parceiros = 0
    for item in (data.get("parceiros") or []):
        nome_p = _str(item.get("nome"))
        if not nome_p:
            continue
        cur2 = db.execute(
            """INSERT INTO parceiros (nome, tipo, pais, papel, descricao, contacto, email)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                nome_p,
                _str(item.get("tipo")),
                _str(item.get("pais")),
                _str(item.get("papel")),
                _str(item.get("descricao")),
                _str(item.get("contacto")),
                _str(item.get("email")),
            ),
        )
        db.execute(
            "INSERT OR IGNORE INTO projeto_parceiro (projeto_id, parceiro_id, papel) VALUES (?, ?, ?)",
            (pid, cur2.lastrowid, _str(item.get("papel"))),
        )
        count_parceiros += 1
    counts["parceiros"] = count_parceiros

    # ------------------------------------------------------------------
    # 3. Stakeholders
    # ------------------------------------------------------------------
    count_sh = 0
    for item in (data.get("stakeholders") or []):
        nome_sh = _str(item.get("nome"))
        if not nome_sh:
            continue
        db.execute(
            """INSERT INTO stakeholders
               (projeto_id, nome, organizacao, papel, interesse, influencia, posicao, estrategia, notas)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                pid,
                nome_sh,
                _str(item.get("organizacao")),
                _str(item.get("papel")),
                _str(item.get("interesse"), "Médio"),
                _str(item.get("influencia"), "Médio"),
                _str(item.get("posicao"), "Neutro"),
                _str(item.get("estrategia")),
                _str(item.get("notas")),
            ),
        )
        count_sh += 1
    counts["stakeholders"] = count_sh

    # ------------------------------------------------------------------
    # 4. Beneficiários
    # ------------------------------------------------------------------
    count_ben = 0
    for item in (data.get("beneficiarios") or []):
        nome_b = _str(item.get("nome"))
        if not nome_b:
            continue
        db.execute(
            """INSERT INTO beneficiarios (projeto_id, nome, tipo, numero, descricao, localizacao)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                pid,
                nome_b,
                _str(item.get("tipo"), "Grupo"),
                int(_num(item.get("numero"))),
                _str(item.get("descricao")),
                _str(item.get("localizacao")),
            ),
        )
        count_ben += 1
    counts["beneficiarios"] = count_ben

    # ------------------------------------------------------------------
    # 5. PEST
    # ------------------------------------------------------------------
    pest = data.get("analise_pest") or {}
    if any(_str(pest.get(k)) for k in ("politico", "economico", "social", "tecnologico")):
        db.execute(
            """INSERT OR REPLACE INTO analise_pest (projeto_id, politico, economico, social, tecnologico)
               VALUES (?, ?, ?, ?, ?)""",
            (pid, _str(pest.get("politico")), _str(pest.get("economico")),
             _str(pest.get("social")), _str(pest.get("tecnologico"))),
        )
        counts["pest"] = 1

    # ------------------------------------------------------------------
    # 6. SWOT
    # ------------------------------------------------------------------
    swot = data.get("analise_swot") or {}
    if any(_str(swot.get(k)) for k in ("forcas", "fraquezas", "oportunidades", "ameacas")):
        db.execute(
            """INSERT OR REPLACE INTO analise_swot (projeto_id, forcas, fraquezas, oportunidades, ameacas)
               VALUES (?, ?, ?, ?, ?)""",
            (pid, _str(swot.get("forcas")), _str(swot.get("fraquezas")),
             _str(swot.get("oportunidades")), _str(swot.get("ameacas"))),
        )
        counts["swot"] = 1

    # ------------------------------------------------------------------
    # 7. Árvore de problemas
    # ------------------------------------------------------------------
    arvore = data.get("arvore_problemas") or {}
    count_arv = 0
    for i, causa in enumerate(arvore.get("causas") or [], 1):
        if _str(causa):
            db.execute(
                "INSERT INTO arvore_problemas (projeto_id, tipo, descricao, ordem) VALUES (?,?,?,?)",
                (pid, "causa", _str(causa), i),
            )
            count_arv += 1
    pc = _str(arvore.get("problema_central"))
    if pc:
        db.execute(
            "INSERT INTO arvore_problemas (projeto_id, tipo, descricao, ordem) VALUES (?,?,?,?)",
            (pid, "problema_central", pc, 1),
        )
        count_arv += 1
    for i, efeito in enumerate(arvore.get("efeitos") or [], 1):
        if _str(efeito):
            db.execute(
                "INSERT INTO arvore_problemas (projeto_id, tipo, descricao, ordem) VALUES (?,?,?,?)",
                (pid, "efeito", _str(efeito), i),
            )
            count_arv += 1
    counts["arvore_problemas"] = count_arv

    # ------------------------------------------------------------------
    # 8. Quadro Lógico
    # ------------------------------------------------------------------
    count_ql = 0
    for item in (data.get("quadro_logico") or []):
        resultado = _str(item.get("resultado"))
        indicador = _str(item.get("indicador"))
        if not resultado and not indicador:
            continue
        nivel = _str(item.get("nivel"), "Resultado")
        if nivel not in _VALID_NIVEIS:
            nivel = "Resultado"
        db.execute(
            """INSERT INTO impacto_quadro_logico
               (projeto_id, nivel, resultado, indicador, unidade, baseline, meta, valor_atual,
                fonte_verificacao, pressupostos, frequencia_medicao, responsavel_medicao, estado)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'Em acompanhamento')""",
            (
                pid, nivel, resultado, indicador,
                _str(item.get("unidade")),
                _num(item.get("baseline")),
                _num(item.get("meta")),
                _str(item.get("fonte_verificacao")),
                _str(item.get("pressupostos")),
                _str(item.get("frequencia_medicao"), "Trimestral"),
                _str(item.get("responsavel_medicao")),
            ),
        )
        count_ql += 1
    counts["quadro_logico"] = count_ql

    # ------------------------------------------------------------------
    # 9. Plano de Avaliação
    # ------------------------------------------------------------------
    count_av = 0
    plano = data.get("plano_avaliacao") or {}
    for criterio, vals in plano.items():
        if criterio not in _VALID_CRITERIOS:
            continue
        if not isinstance(vals, dict):
            continue
        db.execute(
            """INSERT OR REPLACE INTO plano_avaliacao
               (projeto_id, criterio, questoes, indicadores, metodos, fontes, momento)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                pid, criterio,
                _str(vals.get("questoes")), _str(vals.get("indicadores")),
                _str(vals.get("metodos")), _str(vals.get("fontes")),
                _str(vals.get("momento")),
            ),
        )
        count_av += 1
    counts["plano_avaliacao"] = count_av

    # ------------------------------------------------------------------
    # 10. Orçamento
    # ------------------------------------------------------------------
    count_orc = 0
    for item in (data.get("orcamento") or []):
        cat = _str(item.get("categoria") or item.get("rubrica"))
        if not cat:
            continue
        db.execute(
            """INSERT INTO orcamento (projeto_id, tipo, categoria, descricao, valor_previsto)
               VALUES (?, ?, ?, ?, ?)""",
            (
                pid,
                _str(item.get("tipo"), "Previsto"),
                cat,
                _str(item.get("descricao")),
                _num(item.get("valor_previsto") or item.get("valor")),
            ),
        )
        count_orc += 1
    counts["orcamento"] = count_orc

    # ------------------------------------------------------------------
    # 11. Riscos
    # ------------------------------------------------------------------
    count_riscos = 0
    for item in (data.get("riscos") or []):
        desc = _str(item.get("descricao"))
        if not desc:
            continue
        db.execute(
            """INSERT INTO riscos
               (projeto_id, descricao, probabilidade, impacto, estado, mitigacao, plano_contingencia)
               VALUES (?, ?, ?, ?, 'Identificado', ?, ?)""",
            (
                pid, desc,
                _str(item.get("probabilidade"), "Médio"),
                _str(item.get("impacto"), "Médio"),
                _str(item.get("mitigacao")),
                _str(item.get("plano_contingencia")),
            ),
        )
        count_riscos += 1
    counts["riscos"] = count_riscos

    # ------------------------------------------------------------------
    # 12. Milestones
    # ------------------------------------------------------------------
    count_ms = 0
    for item in (data.get("milestones") or []):
        nome_ms = _str(item.get("nome"))
        if not nome_ms:
            continue
        db.execute(
            """INSERT INTO milestones (projeto_id, nome, descricao, data_prevista, estado)
               VALUES (?, ?, ?, ?, ?)""",
            (
                pid, nome_ms,
                _str(item.get("descricao")),
                _str(item.get("data_prevista")),
                _str(item.get("estado"), "Pendente"),
            ),
        )
        count_ms += 1
    counts["milestones"] = count_ms

    # ------------------------------------------------------------------
    # 13. Tarefas
    # ------------------------------------------------------------------
    count_tarefas = 0
    for item in (data.get("tarefas") or []):
        nome_t = _str(item.get("nome"))
        if not nome_t:
            continue
        db.execute(
            """INSERT INTO tarefas (projeto_id, nome, descricao, responsavel, data_inicio, data_fim, prioridade, estado, tags)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                pid,
                nome_t,
                _str(item.get("descricao")),
                _str(item.get("responsavel")),
                _str(item.get("data_inicio")),
                _str(item.get("data_fim")),
                _str(item.get("prioridade"), "Média"),
                _str(item.get("estado"), "A Fazer"),
                _str(item.get("tags")),
            ),
        )
        count_tarefas += 1
    counts["tarefas"] = count_tarefas

    return pid, nome, counts


@bp.route("/api/projects/import-template", methods=["POST"])
@login_required
def api_import_template():
    """
    Accepts a CoopGest JSON template and creates the project + all linked data.
    The JSON must have "tipo": "coopgest-template".
    Returns: { "projeto_id": <id>, "criados": { ... counts ... } }
    """
    import json as _json

    # --- Accept multipart (file upload) or raw JSON body ---
    if "file" in request.files:
        f = request.files["file"]
        try:
            data = _json.loads(f.read().decode("utf-8"))
        except Exception:
            return api_error("JSON inválido no ficheiro", 400, "INVALID_JSON")
    else:
        data = request.get_json(force=True, silent=True)
        if not data:
            return api_error("Body JSON em falta", 400, "VALIDATION_ERROR")

    if data.get("tipo") != "coopgest-template":
        return api_error(
            'O JSON não é um template CoopGest. Certifica-te que tem "tipo": "coopgest-template".',
            400, "INVALID_TEMPLATE",
        )

    db = get_db()
    user_id = session["user_id"]

    try:
        pid, nome, counts = import_coopgest_template(db, user_id, data)
        db.commit()
    except Exception as exc:
        db.rollback()
        return api_error(f"Erro ao importar template: {exc}", 500, "INTERNAL_ERROR")

    return jsonify({"projeto_id": pid, "nome": nome, "criados": counts}), 201


@bp.route("/api/projects/load-sample", methods=["POST"])
@login_required
def api_load_sample_project():
    """
    Loads the sample cooperation project (ECHO Angola) into the DB.
    """
    import json as _json

    possible_paths = [
        os.path.join(current_app.root_path, "..", "template_coopgest_echo_angola.json"),
        os.path.join(os.getcwd(), "template_coopgest_echo_angola.json"),
        os.path.join(current_app.root_path, "template_coopgest_echo_angola.json"),
    ]
    template_path = None
    for p in possible_paths:
        if os.path.exists(p):
            template_path = os.path.abspath(p)
            break

    if not template_path:
        return api_error("Ficheiro de exemplo template_coopgest_echo_angola.json não encontrado", 404, "NOT_FOUND")

    try:
        with open(template_path, "r", encoding="utf-8") as f:
            data = _json.load(f)
    except Exception as exc:
        return api_error(f"Erro ao ler template de exemplo: {exc}", 500, "READ_ERROR")

    if data.get("tipo") != "coopgest-template":
        return api_error("O ficheiro não é um template CoopGest válido.", 400, "INVALID_TEMPLATE")

    db = get_db()
    user_id = session.get("user_id", 1)

    # Check if this exact project was already loaded to avoid duplicates
    sample_nome = _str(data.get("projeto", {}).get("nome"))
    if sample_nome:
        existing = db.execute("SELECT id, nome FROM projetos WHERE nome = ?", (sample_nome,)).fetchone()
        if existing:
            return jsonify({
                "projeto_id": existing["id"],
                "nome": existing["nome"],
                "criados": {},
                "already_exists": True,
                "message": "O projeto exemplo já se encontra carregado."
            }), 200

    try:
        pid, nome, counts = import_coopgest_template(db, user_id, data)
        db.commit()
    except Exception as exc:
        db.rollback()
        return api_error(f"Erro ao carregar projeto exemplo: {exc}", 500, "INTERNAL_ERROR")

    return jsonify({"projeto_id": pid, "nome": nome, "criados": counts}), 201
