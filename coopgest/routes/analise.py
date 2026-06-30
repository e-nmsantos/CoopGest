"""Routes for context analysis: PEST, SWOT, problem tree, evaluation plan."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from coopgest.access import require_project_access, require_project_permission
from coopgest.db import get_db
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("analise", __name__)

_CRITERIOS = ("Relevância", "Coerência", "Eficácia", "Eficiência", "Impacto", "Sustentabilidade")


def _project_id_from_query() -> tuple[int | None, object | None]:
    raw = request.args.get("projeto_id")
    if not raw:
        return None, api_error("projeto_id obrigatório", 400, "VALIDATION_ERROR")
    try:
        return int(raw), None
    except (TypeError, ValueError):
        return None, api_error("projeto_id inválido", 400, "VALIDATION_ERROR")


def _project_id_from_payload(data: dict) -> tuple[int | None, object | None]:
    raw = data.get("projeto_id")
    if not raw:
        return None, api_error("projeto_id obrigatório", 400, "VALIDATION_ERROR")
    try:
        return int(raw), None
    except (TypeError, ValueError):
        return None, api_error("projeto_id inválido", 400, "VALIDATION_ERROR")


def _require_arvore_permission(db, item_id: int):
    row = db.execute("SELECT projeto_id FROM arvore_problemas WHERE id=?", (item_id,)).fetchone()
    if not row:
        return api_error("Item não encontrado", 404, "NOT_FOUND")
    return require_project_permission(db, row["projeto_id"], "membro")


# ---------------------------------------------------------------------------
# PEST
# ---------------------------------------------------------------------------

@bp.route("/api/analise/pest", methods=["GET"])
@login_required
def get_pest():
    pid, error_response = _project_id_from_query()
    if error_response:
        return error_response
    db = get_db()
    access_error = require_project_access(db, pid)
    if access_error:
        return access_error
    row = db.execute("SELECT * FROM analise_pest WHERE projeto_id = ?", (pid,)).fetchone()
    if row:
        return jsonify(dict(row))
    return jsonify({"projeto_id": int(pid), "politico": "", "economico": "", "social": "", "tecnologico": ""})


@bp.route("/api/analise/pest", methods=["PUT"])
@login_required
def save_pest():
    data = request.get_json(force=True) or {}
    pid, error_response = _project_id_from_payload(data)
    if error_response:
        return error_response
    db = get_db()
    permission_error = require_project_permission(db, pid, "membro")
    if permission_error:
        return permission_error
    existing = db.execute("SELECT id FROM analise_pest WHERE projeto_id = ?", (pid,)).fetchone()
    if existing:
        db.execute(
            "UPDATE analise_pest SET politico=?,economico=?,social=?,tecnologico=? WHERE projeto_id=?",
            (data.get("politico",""), data.get("economico",""), data.get("social",""), data.get("tecnologico",""), pid),
        )
    else:
        db.execute(
            "INSERT INTO analise_pest (projeto_id,politico,economico,social,tecnologico) VALUES (?,?,?,?,?)",
            (pid, data.get("politico",""), data.get("economico",""), data.get("social",""), data.get("tecnologico","")),
        )
    db.commit()
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# SWOT
# ---------------------------------------------------------------------------

@bp.route("/api/analise/swot", methods=["GET"])
@login_required
def get_swot():
    pid, error_response = _project_id_from_query()
    if error_response:
        return error_response
    db = get_db()
    access_error = require_project_access(db, pid)
    if access_error:
        return access_error
    row = db.execute("SELECT * FROM analise_swot WHERE projeto_id = ?", (pid,)).fetchone()
    if row:
        return jsonify(dict(row))
    return jsonify({"projeto_id": int(pid), "forcas": "", "fraquezas": "", "oportunidades": "", "ameacas": ""})


@bp.route("/api/analise/swot", methods=["PUT"])
@login_required
def save_swot():
    data = request.get_json(force=True) or {}
    pid, error_response = _project_id_from_payload(data)
    if error_response:
        return error_response
    db = get_db()
    permission_error = require_project_permission(db, pid, "membro")
    if permission_error:
        return permission_error
    existing = db.execute("SELECT id FROM analise_swot WHERE projeto_id = ?", (pid,)).fetchone()
    if existing:
        db.execute(
            "UPDATE analise_swot SET forcas=?,fraquezas=?,oportunidades=?,ameacas=? WHERE projeto_id=?",
            (data.get("forcas",""), data.get("fraquezas",""), data.get("oportunidades",""), data.get("ameacas",""), pid),
        )
    else:
        db.execute(
            "INSERT INTO analise_swot (projeto_id,forcas,fraquezas,oportunidades,ameacas) VALUES (?,?,?,?,?)",
            (pid, data.get("forcas",""), data.get("fraquezas",""), data.get("oportunidades",""), data.get("ameacas","")),
        )
    db.commit()
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Árvore de Problemas
# ---------------------------------------------------------------------------

@bp.route("/api/analise/arvore", methods=["GET"])
@login_required
def get_arvore():
    pid, error_response = _project_id_from_query()
    if error_response:
        return error_response
    db = get_db()
    access_error = require_project_access(db, pid)
    if access_error:
        return access_error
    rows = db.execute(
        "SELECT id,tipo,descricao,ordem FROM arvore_problemas WHERE projeto_id=? ORDER BY tipo,ordem",
        (pid,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@bp.route("/api/analise/arvore", methods=["POST"])
@login_required
def add_arvore():
    data = request.get_json(force=True) or {}
    pid, error_response = _project_id_from_payload(data)
    if error_response:
        return error_response
    tipo = data.get("tipo", "causa")
    descricao = (data.get("descricao") or "").strip()
    if not descricao:
        return api_error("descricao obrigatória", 400, "VALIDATION_ERROR")
    if tipo not in ("causa", "problema_central", "efeito"):
        return api_error("tipo inválido", 400, "VALIDATION_ERROR")
    db = get_db()
    permission_error = require_project_permission(db, pid, "membro")
    if permission_error:
        return permission_error
    max_ord = db.execute(
        "SELECT COALESCE(MAX(ordem),0) FROM arvore_problemas WHERE projeto_id=? AND tipo=?", (pid, tipo)
    ).fetchone()[0]
    cur = db.execute(
        "INSERT INTO arvore_problemas (projeto_id,tipo,descricao,ordem) VALUES (?,?,?,?)",
        (pid, tipo, descricao, max_ord + 1),
    )
    db.commit()
    return jsonify({"id": cur.lastrowid, "tipo": tipo, "descricao": descricao, "ordem": max_ord + 1}), 201


@bp.route("/api/analise/arvore/<int:item_id>", methods=["PUT"])
@login_required
def update_arvore(item_id: int):
    data = request.get_json(force=True) or {}
    descricao = (data.get("descricao") or "").strip()
    if not descricao:
        return api_error("descricao obrigatória", 400, "VALIDATION_ERROR")
    db = get_db()
    permission_error = _require_arvore_permission(db, item_id)
    if permission_error:
        return permission_error
    db.execute("UPDATE arvore_problemas SET descricao=? WHERE id=?", (descricao, item_id))
    db.commit()
    return jsonify({"ok": True})


@bp.route("/api/analise/arvore/<int:item_id>", methods=["DELETE"])
@login_required
def delete_arvore(item_id: int):
    db = get_db()
    permission_error = _require_arvore_permission(db, item_id)
    if permission_error:
        return permission_error
    db.execute("DELETE FROM arvore_problemas WHERE id=?", (item_id,))
    db.commit()
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Plano de Avaliação (CAD/OCDE)
# ---------------------------------------------------------------------------

@bp.route("/api/avaliacao", methods=["GET"])
@login_required
def get_avaliacao():
    pid, error_response = _project_id_from_query()
    if error_response:
        return error_response
    db = get_db()
    access_error = require_project_access(db, pid)
    if access_error:
        return access_error
    rows = db.execute(
        "SELECT criterio,questoes,indicadores,metodos,fontes,momento FROM plano_avaliacao WHERE projeto_id=?",
        (pid,),
    ).fetchall()
    existing = {r["criterio"]: dict(r) for r in rows}
    result = []
    for c in _CRITERIOS:
        result.append(existing.get(c, {
            "criterio": c, "questoes": "", "indicadores": "", "metodos": "", "fontes": "", "momento": ""
        }))
    return jsonify(result)


@bp.route("/api/avaliacao/<criterio>", methods=["PUT"])
@login_required
def save_avaliacao(criterio: str):
    if criterio not in _CRITERIOS:
        return api_error("critério inválido", 400, "VALIDATION_ERROR")
    data = request.get_json(force=True) or {}
    pid, error_response = _project_id_from_payload(data)
    if error_response:
        return error_response
    db = get_db()
    permission_error = require_project_permission(db, pid, "membro")
    if permission_error:
        return permission_error
    db.execute(
        """INSERT INTO plano_avaliacao (projeto_id,criterio,questoes,indicadores,metodos,fontes,momento)
           VALUES (?,?,?,?,?,?,?)
           ON CONFLICT(projeto_id,criterio) DO UPDATE SET
             questoes=excluded.questoes, indicadores=excluded.indicadores,
             metodos=excluded.metodos, fontes=excluded.fontes, momento=excluded.momento""",
        (pid, criterio,
         data.get("questoes",""), data.get("indicadores",""),
         data.get("metodos",""), data.get("fontes",""), data.get("momento","")),
    )
    db.commit()
    return jsonify({"ok": True})
