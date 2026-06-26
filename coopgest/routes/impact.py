from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request

from coopgest.access import can_access_project, require_project_permission, resolve_project_scope
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.validators import validate_impact_payload

bp = Blueprint("impact", __name__)


def _metric_payload(row):
    data = row_to_dict(row)
    data["ods"] = [int(item) for item in data["ods"].split(",")] if data.get("ods") else []
    return data


@bp.route("/api/impact/metrics", methods=["GET", "POST"])
@login_required
def api_impact_metrics():
    if request.method == "POST":
        payload = request.get_json(silent=True)
        metric_data, errors = validate_impact_payload(payload)
        if errors:
            return api_error("Payload inválido", 400, "VALIDATION_ERROR", errors)

        conn = get_db()
        projeto_id, error_response = resolve_project_scope(conn, (payload or {}).get("projeto_id"))
        if error_response:
            conn.close()
            return error_response
        if projeto_id is not None:
            permission_error = require_project_permission(conn, projeto_id, "membro")
            if permission_error:
                conn.close()
                return permission_error
        cursor = conn.execute(
            """INSERT INTO impacto_metricas
               (nome, valor_atual, meta, unidade, categoria, ods, projeto_id, atualizado_em)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                metric_data["nome"],
                metric_data["valor_atual"],
                metric_data["meta"],
                metric_data["unidade"] or "",
                metric_data["categoria"],
                ",".join([str(item) for item in (metric_data["ods"] or [])]),
                projeto_id,
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        metric_id = cursor.lastrowid
        conn.commit()
        row = conn.execute("SELECT * FROM impacto_metricas WHERE id=?", (metric_id,)).fetchone()
        conn.close()
        return jsonify(_metric_payload(row)), 201

    conn = get_db()
    projeto_id, error_response = resolve_project_scope(conn, request.args.get("projeto_id"))
    if error_response:
        conn.close()
        return error_response

    if projeto_id is not None:
        rows = conn.execute(
            "SELECT * FROM impacto_metricas WHERE projeto_id=? ORDER BY id DESC",
            (projeto_id,),
        ).fetchall()
    else:
        rows = [
            row
            for row in conn.execute("SELECT * FROM impacto_metricas ORDER BY id DESC").fetchall()
            if row["projeto_id"] is None or can_access_project(conn, row["projeto_id"])
        ]
    conn.close()
    return jsonify([_metric_payload(row) for row in rows])


@bp.route("/api/impact/metrics/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_impact_metric_detail(id):
    if request.method == "DELETE":
        conn = get_db()
        existing = conn.execute("SELECT id, projeto_id FROM impacto_metricas WHERE id=?", (id,)).fetchone()
        if not existing:
            conn.close()
            return api_error("Métrica não encontrada", 404, "NOT_FOUND")
        if existing["projeto_id"]:
            permission_error = require_project_permission(conn, existing["projeto_id"], "membro")
            if permission_error:
                conn.close()
                return permission_error

        conn.execute("DELETE FROM impacto_metricas WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Métrica eliminada com sucesso"})

    payload = request.get_json(silent=True)
    metric_data, errors = validate_impact_payload(payload, partial=True)
    if errors:
        return api_error("Payload inválido", 400, "VALIDATION_ERROR", errors)

    updates = [
        (field, value)
        for field, value in [
            ("nome", metric_data.get("nome")),
            ("valor_atual", metric_data.get("valor_atual")),
            ("meta", metric_data.get("meta")),
            ("unidade", metric_data.get("unidade")),
            ("categoria", metric_data.get("categoria")),
            (
                "ods",
                ",".join([str(item) for item in metric_data.get("ods", [])])
                if metric_data.get("ods") is not None
                else None,
            ),
        ]
        if value is not None
    ]
    updates.append(("atualizado_em", datetime.now().isoformat(timespec="seconds")))
    if len(updates) == 1:
        return api_error("Nenhum campo para atualizar", 400, "VALIDATION_ERROR")

    conn = get_db()
    existing = conn.execute("SELECT id, projeto_id FROM impacto_metricas WHERE id=?", (id,)).fetchone()
    if not existing:
        conn.close()
        return api_error("Métrica não encontrada", 404, "NOT_FOUND")
    if existing["projeto_id"]:
        permission_error = require_project_permission(conn, existing["projeto_id"], "membro")
        if permission_error:
            conn.close()
            return permission_error

    set_clause = ", ".join([f"{field}=?" for field, _ in updates])
    values = [value for _, value in updates]
    values.append(id)
    conn.execute(f"UPDATE impacto_metricas SET {set_clause} WHERE id=?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM impacto_metricas WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(_metric_payload(row))


@bp.route("/api/impact/logframe", methods=["GET", "POST"])
@login_required
def api_impact_logframe():
    conn = get_db()
    raw_project_id = request.args.get("projeto_id") if request.method == "GET" else (request.get_json(silent=True) or {}).get("projeto_id")
    projeto_id, error_response = resolve_project_scope(conn, raw_project_id)
    if error_response:
        conn.close()
        return error_response
    if projeto_id is None:
        conn.close()
        return api_error("Projeto obrigatório para quadro lógico", 400, "VALIDATION_ERROR")

    if request.method == "POST":
        permission_error = require_project_permission(conn, projeto_id, "membro")
        if permission_error:
            conn.close()
            return permission_error
        payload = request.get_json(silent=True) or {}
        resultado = str(payload.get("resultado", "")).strip()
        indicador = str(payload.get("indicador", "")).strip()
        if not resultado or not indicador:
            conn.close()
            return api_error("Resultado e indicador são obrigatórios", 400, "VALIDATION_ERROR")

        cursor = conn.execute(
            """INSERT INTO impacto_quadro_logico
               (projeto_id, resultado, indicador, fonte_verificacao, baseline, meta, valor_atual, estado, proxima_revisao, atualizado_em)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                projeto_id,
                resultado,
                indicador,
                str(payload.get("fonte_verificacao", "") or "").strip(),
                float(payload.get("baseline") or 0),
                float(payload.get("meta") or 0),
                float(payload.get("valor_atual") or 0),
                str(payload.get("estado", "") or "Em acompanhamento").strip(),
                str(payload.get("proxima_revisao", "") or "").strip(),
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM impacto_quadro_logico WHERE id=?", (cursor.lastrowid,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    rows = conn.execute(
        "SELECT * FROM impacto_quadro_logico WHERE projeto_id=? ORDER BY criado_em DESC",
        (projeto_id,),
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])


@bp.route("/api/impact/logframe/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_impact_logframe_detail(id):
    conn = get_db()
    existing = conn.execute("SELECT id, projeto_id FROM impacto_quadro_logico WHERE id=?", (id,)).fetchone()
    if not existing:
        conn.close()
        return api_error("Elemento do quadro lógico não encontrado", 404, "NOT_FOUND")
    permission_error = require_project_permission(conn, existing["projeto_id"], "membro")
    if permission_error:
        conn.close()
        return permission_error

    if request.method == "DELETE":
        conn.execute("DELETE FROM impacto_quadro_logico WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Elemento eliminado com sucesso"})

    payload = request.get_json(silent=True) or {}
    fields = []
    for field in ["resultado", "indicador", "fonte_verificacao", "estado", "proxima_revisao"]:
        if field in payload:
            fields.append((field, str(payload.get(field) or "").strip()))
    for field in ["baseline", "meta", "valor_atual"]:
        if field in payload:
            fields.append((field, float(payload.get(field) or 0)))
    fields.append(("atualizado_em", datetime.now().isoformat(timespec="seconds")))

    set_clause = ", ".join([f"{field}=?" for field, _ in fields])
    values = [value for _, value in fields]
    values.append(id)
    conn.execute(f"UPDATE impacto_quadro_logico SET {set_clause} WHERE id=?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM impacto_quadro_logico WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))

