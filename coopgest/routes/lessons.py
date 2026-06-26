from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request, session

from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.access import require_project_permission

bp = Blueprint("lessons", __name__)

_AREAS = ("M&E", "Financeiro", "Parceiros", "Equipa", "Técnico", "Comunicação", "Gestão", "Outro")
_FASES = ("Início", "Planeamento", "Execução", "Monitorização", "Encerramento")
_TIPOS = ("Positiva", "Negativa", "Neutra")
_IMPACTOS = ("Alto", "Médio", "Baixo")


def _lesson_row(row):
    d = row_to_dict(row)
    return d


@bp.route("/api/projects/<int:projeto_id>/lessons", methods=["GET"])
@login_required
def api_list_lessons(projeto_id):
    conn = get_db()
    err = require_project_permission(conn, projeto_id, "membro")
    if err:
        conn.close()
        return err

    area = request.args.get("area")
    tipo = request.args.get("tipo")
    fase = request.args.get("fase")

    conditions = ["projeto_id = ?"]
    params: list = [projeto_id]

    if area:
        conditions.append("area = ?")
        params.append(area)
    if tipo:
        conditions.append("tipo = ?")
        params.append(tipo)
    if fase:
        conditions.append("fase_projeto = ?")
        params.append(fase)

    where = " AND ".join(conditions)
    rows = conn.execute(
        f"SELECT * FROM licoes_aprendidas WHERE {where} ORDER BY criado_em DESC",
        params,
    ).fetchall()
    conn.close()
    return jsonify([_lesson_row(r) for r in rows])


@bp.route("/api/projects/<int:projeto_id>/lessons", methods=["POST"])
@login_required
def api_create_lesson(projeto_id):
    conn = get_db()
    err = require_project_permission(conn, projeto_id, "membro")
    if err:
        conn.close()
        return err

    payload = request.get_json(silent=True) or {}
    titulo = str(payload.get("titulo") or "").strip()
    if not titulo:
        conn.close()
        return api_error("titulo é obrigatório", 400, "VALIDATION_ERROR")

    area = str(payload.get("area") or "Gestão").strip()
    if area not in _AREAS:
        conn.close()
        return api_error(f"area deve ser uma de: {', '.join(_AREAS)}", 400, "VALIDATION_ERROR")

    tipo = str(payload.get("tipo") or "Positiva").strip()
    if tipo not in _TIPOS:
        conn.close()
        return api_error(f"tipo deve ser um de: {', '.join(_TIPOS)}", 400, "VALIDATION_ERROR")

    fase = str(payload.get("fase_projeto") or "Execução").strip()
    if fase not in _FASES:
        conn.close()
        return api_error(f"fase_projeto deve ser uma de: {', '.join(_FASES)}", 400, "VALIDATION_ERROR")

    impacto = str(payload.get("impacto") or "Médio").strip()
    if impacto not in _IMPACTOS:
        conn.close()
        return api_error(f"impacto deve ser um de: {', '.join(_IMPACTOS)}", 400, "VALIDATION_ERROR")

    now = datetime.now().isoformat(timespec="seconds")
    cursor = conn.execute(
        """INSERT INTO licoes_aprendidas
           (projeto_id, titulo, descricao, area, fase_projeto, tipo, impacto, recomendacao,
            criado_por, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            projeto_id,
            titulo,
            str(payload.get("descricao") or "").strip(),
            area,
            fase,
            tipo,
            impacto,
            str(payload.get("recomendacao") or "").strip(),
            session.get("username", ""),
            now,
            now,
        ),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM licoes_aprendidas WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    conn.close()
    return jsonify(_lesson_row(row)), 201


@bp.route("/api/projects/<int:projeto_id>/lessons/<int:lesson_id>", methods=["PUT"])
@login_required
def api_update_lesson(projeto_id, lesson_id):
    conn = get_db()
    err = require_project_permission(conn, projeto_id, "membro")
    if err:
        conn.close()
        return err

    row = conn.execute(
        "SELECT id FROM licoes_aprendidas WHERE id = ? AND projeto_id = ?",
        (lesson_id, projeto_id),
    ).fetchone()
    if not row:
        conn.close()
        return api_error("Lição não encontrada", 404, "NOT_FOUND")

    payload = request.get_json(silent=True) or {}
    fields = []
    params = []
    for field in ["titulo", "descricao", "area", "fase_projeto", "tipo", "impacto", "recomendacao"]:
        if field in payload:
            fields.append(f"{field} = ?")
            params.append(str(payload[field]).strip())

    if not fields:
        conn.close()
        return api_error("Nenhum campo para atualizar", 400, "VALIDATION_ERROR")

    fields.append("atualizado_em = ?")
    params.append(datetime.now().isoformat(timespec="seconds"))
    params.extend([lesson_id, projeto_id])

    conn.execute(
        f"UPDATE licoes_aprendidas SET {', '.join(fields)} WHERE id = ? AND projeto_id = ?",
        params,
    )
    conn.commit()
    updated = conn.execute(
        "SELECT * FROM licoes_aprendidas WHERE id = ?", (lesson_id,)
    ).fetchone()
    conn.close()
    return jsonify(_lesson_row(updated))


@bp.route("/api/projects/<int:projeto_id>/lessons/<int:lesson_id>", methods=["DELETE"])
@login_required
def api_delete_lesson(projeto_id, lesson_id):
    conn = get_db()
    err = require_project_permission(conn, projeto_id, "membro")
    if err:
        conn.close()
        return err

    conn.execute(
        "DELETE FROM licoes_aprendidas WHERE id = ? AND projeto_id = ?",
        (lesson_id, projeto_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@bp.route("/api/projects/<int:projeto_id>/lessons/meta", methods=["GET"])
@login_required
def api_lessons_meta(projeto_id):
    return jsonify({
        "areas": list(_AREAS),
        "fases": list(_FASES),
        "tipos": list(_TIPOS),
        "impactos": list(_IMPACTOS),
    })
