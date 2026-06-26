from __future__ import annotations

from flask import Blueprint, jsonify, request

from coopgest.access import require_project_access, require_project_permission, require_row_project_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit

bp = Blueprint("risks", __name__)

_PROBABILIDADES = ("Baixo", "Médio", "Alto", "Muito Alto")
_IMPACTOS = ("Baixo", "Médio", "Alto", "Muito Alto")
_ESTADOS = ("Identificado", "Em análise", "Em mitigação", "Mitigado", "Concretizado", "Aceite")

# Risk score matrix: probability × impact → score 1-16
_SCORE_MAP = {
    ("Baixo", "Baixo"): 1,
    ("Baixo", "Médio"): 2,
    ("Baixo", "Alto"): 3,
    ("Baixo", "Muito Alto"): 4,
    ("Médio", "Baixo"): 2,
    ("Médio", "Médio"): 4,
    ("Médio", "Alto"): 6,
    ("Médio", "Muito Alto"): 8,
    ("Alto", "Baixo"): 3,
    ("Alto", "Médio"): 6,
    ("Alto", "Alto"): 9,
    ("Alto", "Muito Alto"): 12,
    ("Muito Alto", "Baixo"): 4,
    ("Muito Alto", "Médio"): 8,
    ("Muito Alto", "Alto"): 12,
    ("Muito Alto", "Muito Alto"): 16,
}


def _risk_payload(row):
    data = row_to_dict(row)
    data["score"] = _SCORE_MAP.get((data.get("probabilidade", "Médio"), data.get("impacto", "Médio")), 4)
    data["nivel_risco"] = _nivel_risco(data["score"])
    return data


def _nivel_risco(score: int) -> str:
    if score <= 2:
        return "Baixo"
    if score <= 6:
        return "Médio"
    if score <= 9:
        return "Alto"
    return "Crítico"


@bp.route("/api/projects/<int:projeto_id>/risks", methods=["GET", "POST"])
@login_required
def api_project_risks(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error

    if request.method == "POST":
        permission_error = require_project_permission(conn, projeto_id, "membro")
        if permission_error:
            conn.close()
            return permission_error
        payload = request.get_json(silent=True)
        descricao = str(payload.get("descricao", "")).strip() if payload else ""
        if not descricao:
            conn.close()
            return api_error("Descrição é obrigatória", 400, "VALIDATION_ERROR")

        probabilidade = str(payload.get("probabilidade") or "Médio").strip()
        if probabilidade not in _PROBABILIDADES:
            probabilidade = "Médio"
        impacto = str(payload.get("impacto") or "Médio").strip()
        if impacto not in _IMPACTOS:
            impacto = "Médio"
        estado = str(payload.get("estado") or "Identificado").strip()
        if estado not in _ESTADOS:
            estado = "Identificado"

        cursor = conn.execute(
            """INSERT INTO riscos
               (projeto_id, descricao, probabilidade, impacto, estado, mitigacao,
                dono, proxima_revisao, plano_contingencia)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                projeto_id,
                descricao,
                probabilidade,
                impacto,
                estado,
                payload.get("mitigacao", "") or "",
                str(payload.get("dono") or "").strip(),
                str(payload.get("proxima_revisao") or "").strip(),
                str(payload.get("plano_contingencia") or "").strip(),
            ),
        )
        new_id = cursor.lastrowid
        log_audit(conn, "criado", "risco", new_id, descricao[:140], projeto_id)
        conn.commit()
        row = conn.execute("SELECT * FROM riscos WHERE id=?", (new_id,)).fetchone()
        conn.close()
        return jsonify(_risk_payload(row)), 201

    rows = conn.execute(
        "SELECT * FROM riscos WHERE projeto_id=? ORDER BY criado_em ASC", (projeto_id,)
    ).fetchall()
    conn.close()
    return jsonify([_risk_payload(r) for r in rows])


@bp.route("/api/risks/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_risk_detail(id):
    conn = get_db()
    row, access_error = require_row_project_access(conn, "riscos", id, "Risco não encontrado", "membro")
    if access_error:
        conn.close()
        return access_error

    if request.method == "DELETE":
        log_audit(conn, "eliminado", "risco", id, row["descricao"][:140], row["projeto_id"])
        conn.execute("DELETE FROM riscos WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Risco eliminado"})

    payload = request.get_json(silent=True) or {}
    updates = []
    for field in ["descricao", "mitigacao", "dono", "proxima_revisao", "plano_contingencia"]:
        if field in payload:
            updates.append((field, str(payload[field] or "").strip()))
    if "probabilidade" in payload:
        p = str(payload["probabilidade"]).strip()
        updates.append(("probabilidade", p if p in _PROBABILIDADES else "Médio"))
    if "impacto" in payload:
        imp = str(payload["impacto"]).strip()
        updates.append(("impacto", imp if imp in _IMPACTOS else "Médio"))
    if "estado" in payload:
        e = str(payload["estado"]).strip()
        updates.append(("estado", e if e in _ESTADOS else "Identificado"))

    if updates:
        set_clause = ", ".join([f"{field}=?" for field, _ in updates])
        values = [value for _, value in updates] + [id]
        conn.execute(f"UPDATE riscos SET {set_clause} WHERE id=?", values)
        log_audit(conn, "atualizado", "risco", id, str({field: value for field, value in updates}), row["projeto_id"])
        conn.commit()
    updated = conn.execute("SELECT * FROM riscos WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(_risk_payload(updated))
