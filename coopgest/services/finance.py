from __future__ import annotations

import os
import unicodedata
import uuid

from flask import request
from werkzeug.utils import secure_filename

from coopgest.access import can_access_project, resolve_project_scope
from coopgest.config import ALLOWED_UPLOAD_EXTENSIONS, UPLOAD_FOLDER
from coopgest.db import row_to_dict
from coopgest.http_helpers import api_error

FINANCE_DEFAULT_CATEGORIES = [
    "Recursos humanos",
    "Consultoria",
    "Formacao e capacitacao",
    "Deslocacoes e estadias",
    "Equipamentos",
    "Comunicacao e visibilidade",
    "Monitorizacao e avaliacao",
    "Custos administrativos",
    "Financiamento",
    "Cofinanciamento",
]


def finance_float(value, default=0):
    try:
        return float(value if value is not None and value != "" else default)
    except (TypeError, ValueError):
        return default


def finance_normalize_text(value):
    text = unicodedata.normalize("NFKD", str(value or "").strip().lower())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return " ".join(text.split())


def finance_normalize_type(value):
    normalized = finance_normalize_text(value)
    return "Receita" if normalized == "receita" else "Despesa"


def finance_key(project_id, tipo, categoria):
    category = finance_normalize_text(categoria or "Sem categoria")
    return (project_id, finance_normalize_type(tipo), category or "sem categoria")


def finance_payload():
    if request.form:
        return request.form.to_dict()
    return request.get_json(silent=True) or {}


def _extension(filename):
    return filename.rsplit(".", 1)[-1].lower() if filename and "." in filename else ""


def _is_allowed_upload(filename):
    return _extension(filename) in ALLOWED_UPLOAD_EXTENSIONS


def save_finance_attachment(file_storage):
    if not file_storage or not file_storage.filename:
        return {
            "anexo_nome": "",
            "anexo_ficheiro": "",
            "anexo_tipo": "",
            "anexo_tamanho": 0,
        }, None

    if not _is_allowed_upload(file_storage.filename):
        return None, api_error("Tipo de anexo nao permitido", 400, "VALIDATION_ERROR")

    original = secure_filename(file_storage.filename)
    stored = f"finance_{uuid.uuid4().hex}_{original}"
    path = os.path.join(UPLOAD_FOLDER, stored)
    file_storage.save(path)
    return {
        "anexo_nome": original,
        "anexo_ficheiro": stored,
        "anexo_tipo": _extension(original),
        "anexo_tamanho": os.path.getsize(path),
    }, None


def attach_finance_urls(rows):
    items = []
    for row in rows:
        item = row_to_dict(row)
        if item.get("anexo_ficheiro"):
            item["anexo_url"] = f'/api/finances/transactions/{item["id"]}/attachment'
        else:
            item["anexo_url"] = ""
        items.append(item)
    return items


def apply_finance_execution_to_budget(conn, project_id, budget_items):
    execution_rows = conn.execute(
        """SELECT tipo, COALESCE(NULLIF(categoria, ''), 'Sem categoria') AS categoria,
                  COALESCE(SUM(valor * COALESCE(taxa_cambio, 1.0)), 0) AS executado
           FROM movimentos_financeiros
           WHERE projeto_id=?
           GROUP BY tipo, COALESCE(NULLIF(categoria, ''), 'Sem categoria')""",
        (project_id,),
    ).fetchall()
    execution = {
        finance_key(project_id, row["tipo"], row["categoria"]): row["executado"] or 0
        for row in execution_rows
    }
    for item in budget_items:
        category = item.get("categoria") or "Sem categoria"
        key = finance_key(project_id, item.get("tipo"), category)
        if key in execution:
            item["valor_real"] = execution[key]
            item["valor_real_origem"] = "movimentos_financeiros"
    return budget_items


def finance_scope_ids(conn, raw_project_id=None):
    if raw_project_id not in (None, ""):
        project_id, error = resolve_project_scope(conn, raw_project_id, required=True)
        if error:
            return None, error
        return [project_id], None

    rows = conn.execute("SELECT id FROM projetos WHERE arquivado=0 ORDER BY criado_em DESC").fetchall()
    accessible = [row["id"] for row in rows if can_access_project(conn, row["id"])]
    return accessible, None


def build_finance_payload(conn, raw_project_id=None):
    project_ids, error = finance_scope_ids(conn, raw_project_id)
    if error:
        return None, error

    if not project_ids:
        return {
            "projects": [],
            "transactions": [],
            "categories": FINANCE_DEFAULT_CATEGORIES,
            "category_summary": [],
            "project_summary": [],
            "totals": {
                "receitas_previstas": 0,
                "receitas_executadas": 0,
                "despesas_previstas": 0,
                "despesas_executadas": 0,
                "saldo_previsto": 0,
                "saldo_executado": 0,
                "execucao_despesa_percent": 0,
                "execucao_receita_percent": 0,
            },
        }, None

    placeholders = ",".join("?" * len(project_ids))
    projects = [
        row_to_dict(row)
        for row in conn.execute(
            f"SELECT id, nome, estado FROM projetos WHERE id IN ({placeholders}) ORDER BY nome",
            project_ids,
        ).fetchall()
    ]

    transactions = attach_finance_urls(
        conn.execute(
            f"""SELECT mf.*, p.nome AS projeto_nome
                FROM movimentos_financeiros mf
                JOIN projetos p ON p.id = mf.projeto_id
                WHERE mf.projeto_id IN ({placeholders})
                ORDER BY mf.data_movimento DESC, mf.criado_em DESC
                LIMIT 500""",
            project_ids,
        ).fetchall()
    )

    budget_rows = conn.execute(
        f"""SELECT projeto_id, tipo, COALESCE(NULLIF(categoria, ''), 'Sem categoria') AS categoria,
                   COALESCE(SUM(valor_previsto), 0) AS previsto,
                   COALESCE(SUM(valor_real), 0) AS real_manual
            FROM orcamento
            WHERE projeto_id IN ({placeholders})
            GROUP BY projeto_id, tipo, COALESCE(NULLIF(categoria, ''), 'Sem categoria')""",
        project_ids,
    ).fetchall()

    movement_rows = conn.execute(
        f"""SELECT projeto_id, tipo, COALESCE(NULLIF(categoria, ''), 'Sem categoria') AS categoria,
                   COALESCE(SUM(valor * COALESCE(taxa_cambio, 1.0)), 0) AS executado,
                   COUNT(*) AS movimentos
            FROM movimentos_financeiros
            WHERE projeto_id IN ({placeholders})
            GROUP BY projeto_id, tipo, COALESCE(NULLIF(categoria, ''), 'Sem categoria')""",
        project_ids,
    ).fetchall()

    by_key = {}
    for row in budget_rows:
        key = finance_key(row["projeto_id"], row["tipo"], row["categoria"])
        by_key[key] = {
            "projeto_id": row["projeto_id"],
            "tipo": finance_normalize_type(row["tipo"]),
            "categoria": row["categoria"],
            "previsto": row["previsto"] or 0,
            "executado": row["real_manual"] or 0,
            "movimentos": 0,
            "tem_rubrica_prevista": True,
        }

    for row in movement_rows:
        key = finance_key(row["projeto_id"], row["tipo"], row["categoria"])
        current = by_key.setdefault(
            key,
            {
                "projeto_id": row["projeto_id"],
                "tipo": finance_normalize_type(row["tipo"]),
                "categoria": row["categoria"],
                "previsto": 0,
                "executado": 0,
                "movimentos": 0,
                "tem_rubrica_prevista": False,
            },
        )
        current["executado"] = row["executado"] or 0
        current["movimentos"] = row["movimentos"] or 0

    project_names = {project["id"]: project["nome"] for project in projects}
    category_summary = []
    for item in by_key.values():
        planned = item["previsto"] or 0
        actual = item["executado"] or 0
        category_summary.append({
            **item,
            "projeto_nome": project_names.get(item["projeto_id"], ""),
            "desvio": planned - actual,
            "execucao_percent": round((actual / planned) * 100, 1) if planned else 0,
        })
    category_summary.sort(key=lambda item: (item["projeto_nome"], item["tipo"], item["categoria"]))

    totals = {
        "receitas_previstas": 0,
        "receitas_executadas": 0,
        "despesas_previstas": 0,
        "despesas_executadas": 0,
    }
    project_summary = []
    for project in projects:
        rows = [item for item in category_summary if item["projeto_id"] == project["id"]]
        receitas_previstas = sum(item["previsto"] for item in rows if item["tipo"] == "Receita")
        receitas_executadas = sum(item["executado"] for item in rows if item["tipo"] == "Receita")
        despesas_previstas = sum(item["previsto"] for item in rows if item["tipo"] == "Despesa")
        despesas_executadas = sum(item["executado"] for item in rows if item["tipo"] == "Despesa")
        totals["receitas_previstas"] += receitas_previstas
        totals["receitas_executadas"] += receitas_executadas
        totals["despesas_previstas"] += despesas_previstas
        totals["despesas_executadas"] += despesas_executadas
        project_summary.append({
            "projeto_id": project["id"],
            "projeto_nome": project["nome"],
            "estado": project.get("estado", ""),
            "receitas_previstas": receitas_previstas,
            "receitas_executadas": receitas_executadas,
            "despesas_previstas": despesas_previstas,
            "despesas_executadas": despesas_executadas,
            "saldo_previsto": receitas_previstas - despesas_previstas,
            "saldo_executado": receitas_executadas - despesas_executadas,
            "execucao_despesa_percent": round((despesas_executadas / despesas_previstas) * 100, 1) if despesas_previstas else 0,
        })

    totals["saldo_previsto"] = totals["receitas_previstas"] - totals["despesas_previstas"]
    totals["saldo_executado"] = totals["receitas_executadas"] - totals["despesas_executadas"]
    totals["execucao_despesa_percent"] = round((totals["despesas_executadas"] / totals["despesas_previstas"]) * 100, 1) if totals["despesas_previstas"] else 0
    totals["execucao_receita_percent"] = round((totals["receitas_executadas"] / totals["receitas_previstas"]) * 100, 1) if totals["receitas_previstas"] else 0

    budget_categories = {row["categoria"] for row in budget_rows if row["categoria"]}
    movement_categories = {row["categoria"] for row in movement_rows if row["categoria"]}
    categories = sorted(
        budget_categories | movement_categories
        if budget_categories
        else set(FINANCE_DEFAULT_CATEGORIES) | movement_categories
    )

    return {
        "projects": projects,
        "transactions": transactions,
        "categories": categories,
        "category_summary": category_summary,
        "project_summary": project_summary,
        "totals": totals,
    }, None
