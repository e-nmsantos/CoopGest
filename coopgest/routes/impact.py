from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request, session

from coopgest.access import can_access_project, require_project_access, require_project_permission, resolve_project_scope
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.validators import validate_impact_payload

bp = Blueprint("impact", __name__)

_LOGFRAME_NIVEIS = ("Impacto", "Resultado", "Produção", "Atividade")
_LOGFRAME_FREQUENCIAS = ("Mensal", "Bimestral", "Trimestral", "Semestral", "Anual")
_LOGFRAME_ESTADOS = ("Em acompanhamento", "Alcançado", "Em risco", "Não iniciado", "Suspenso")


def _metric_payload(row):
    data = row_to_dict(row)
    data["ods"] = [int(item) for item in data["ods"].split(",")] if data.get("ods") else []
    return data


# ---------------------------------------------------------------------------
# Impact Metrics
# ---------------------------------------------------------------------------

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
        # Record the initial value in history
        conn.execute(
            "INSERT INTO impacto_metricas_historico (metrica_id, projeto_id, valor, notas, registado_por) VALUES (?,?,?,?,?)",
            (metric_id, projeto_id, metric_data["valor_atual"], "Valor inicial", session.get("nome", session.get("username", ""))),
        )
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
    existing = conn.execute("SELECT * FROM impacto_metricas WHERE id=?", (id,)).fetchone()
    if not existing:
        conn.close()
        return api_error("Métrica não encontrada", 404, "NOT_FOUND")
    if existing["projeto_id"]:
        permission_error = require_project_permission(conn, existing["projeto_id"], "membro")
        if permission_error:
            conn.close()
            return permission_error

    new_valor = metric_data.get("valor_atual")
    if new_valor is not None and new_valor != existing["valor_atual"]:
        notas = str((payload or {}).get("notas_medicao") or "").strip()
        conn.execute(
            "INSERT INTO impacto_metricas_historico (metrica_id, projeto_id, valor, notas, registado_por) VALUES (?,?,?,?,?)",
            (id, existing["projeto_id"], new_valor, notas, session.get("nome", session.get("username", ""))),
        )

    set_clause = ", ".join([f"{field}=?" for field, _ in updates])
    values = [value for _, value in updates]
    values.append(id)
    conn.execute(f"UPDATE impacto_metricas SET {set_clause} WHERE id=?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM impacto_metricas WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(_metric_payload(row))


@bp.route("/api/impact/metrics/<int:id>/history", methods=["GET"])
@login_required
def api_impact_metric_history(id):
    conn = get_db()
    existing = conn.execute("SELECT id, projeto_id FROM impacto_metricas WHERE id=?", (id,)).fetchone()
    if not existing:
        conn.close()
        return api_error("Métrica não encontrada", 404, "NOT_FOUND")
    if existing["projeto_id"]:
        access_error = require_project_access(conn, existing["projeto_id"])
        if access_error:
            conn.close()
            return access_error
    rows = conn.execute(
        "SELECT * FROM impacto_metricas_historico WHERE metrica_id=? ORDER BY criado_em ASC", (id,)
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


# ---------------------------------------------------------------------------
# Logical Framework (Quadro Lógico)
# ---------------------------------------------------------------------------

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

        nivel = str(payload.get("nivel") or "Resultado").strip()
        if nivel not in _LOGFRAME_NIVEIS:
            nivel = "Resultado"
        frequencia = str(payload.get("frequencia_medicao") or "Trimestral").strip()
        if frequencia not in _LOGFRAME_FREQUENCIAS:
            frequencia = "Trimestral"
        estado = str(payload.get("estado") or "Em acompanhamento").strip()
        if estado not in _LOGFRAME_ESTADOS:
            estado = "Em acompanhamento"
        valor_inicial = float(payload.get("valor_atual") or 0)

        cursor = conn.execute(
            """INSERT INTO impacto_quadro_logico
               (projeto_id, nivel, resultado, indicador, unidade, fonte_verificacao, baseline, meta,
                valor_atual, estado, proxima_revisao, frequencia_medicao, responsavel_medicao,
                pressupostos, atualizado_em)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                projeto_id,
                nivel,
                resultado,
                indicador,
                str(payload.get("unidade") or "").strip(),
                str(payload.get("fonte_verificacao", "") or "").strip(),
                float(payload.get("baseline") or 0),
                float(payload.get("meta") or 0),
                valor_inicial,
                estado,
                str(payload.get("proxima_revisao", "") or "").strip(),
                frequencia,
                str(payload.get("responsavel_medicao") or "").strip(),
                str(payload.get("pressupostos") or "").strip(),
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        new_id = cursor.lastrowid
        # Record initial value in history
        conn.execute(
            "INSERT INTO impacto_quadro_logico_historico (indicador_id, projeto_id, valor, notas, registado_por) VALUES (?,?,?,?,?)",
            (new_id, projeto_id, valor_inicial, "Valor inicial", session.get("nome", session.get("username", ""))),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM impacto_quadro_logico WHERE id=?", (new_id,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    rows = conn.execute(
        "SELECT * FROM impacto_quadro_logico WHERE projeto_id=? ORDER BY nivel, criado_em",
        (projeto_id,),
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])


@bp.route("/api/impact/logframe/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_impact_logframe_detail(id):
    conn = get_db()
    existing = conn.execute("SELECT * FROM impacto_quadro_logico WHERE id=?", (id,)).fetchone()
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
    for field in ["resultado", "indicador", "unidade", "fonte_verificacao", "proxima_revisao", "responsavel_medicao", "pressupostos"]:
        if field in payload:
            fields.append((field, str(payload.get(field) or "").strip()))
    if "nivel" in payload:
        nivel = str(payload["nivel"]).strip()
        fields.append(("nivel", nivel if nivel in _LOGFRAME_NIVEIS else "Resultado"))
    if "estado" in payload:
        estado = str(payload["estado"]).strip()
        fields.append(("estado", estado if estado in _LOGFRAME_ESTADOS else "Em acompanhamento"))
    if "frequencia_medicao" in payload:
        freq = str(payload["frequencia_medicao"]).strip()
        fields.append(("frequencia_medicao", freq if freq in _LOGFRAME_FREQUENCIAS else "Trimestral"))
    for field in ["baseline", "meta", "valor_atual"]:
        if field in payload:
            fields.append((field, float(payload.get(field) or 0)))
    fields.append(("atualizado_em", datetime.now().isoformat(timespec="seconds")))

    # Record to history when valor_atual changes
    if "valor_atual" in payload:
        new_valor = float(payload.get("valor_atual") or 0)
        if new_valor != existing["valor_atual"]:
            notas = str(payload.get("notas_medicao") or "").strip()
            conn.execute(
                "INSERT INTO impacto_quadro_logico_historico (indicador_id, projeto_id, valor, notas, registado_por) VALUES (?,?,?,?,?)",
                (id, existing["projeto_id"], new_valor, notas, session.get("nome", session.get("username", ""))),
            )

    set_clause = ", ".join([f"{field}=?" for field, _ in fields])
    values = [value for _, value in fields]
    values.append(id)
    conn.execute(f"UPDATE impacto_quadro_logico SET {set_clause} WHERE id=?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM impacto_quadro_logico WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))


@bp.route("/api/impact/logframe/<int:id>/history", methods=["GET", "POST"])
@login_required
def api_impact_logframe_history(id):
    conn = get_db()
    existing = conn.execute("SELECT * FROM impacto_quadro_logico WHERE id=?", (id,)).fetchone()
    if not existing:
        conn.close()
        return api_error("Indicador não encontrado", 404, "NOT_FOUND")
    access_error = require_project_access(conn, existing["projeto_id"])
    if access_error:
        conn.close()
        return access_error

    if request.method == "POST":
        permission_error = require_project_permission(conn, existing["projeto_id"], "membro")
        if permission_error:
            conn.close()
            return permission_error
        payload = request.get_json(silent=True) or {}
        valor_raw = payload.get("valor")
        if valor_raw is None:
            conn.close()
            return api_error("Valor é obrigatório", 400, "VALIDATION_ERROR")
        valor = float(valor_raw)
        notas = str(payload.get("notas") or "").strip()
        cursor = conn.execute(
            "INSERT INTO impacto_quadro_logico_historico (indicador_id, projeto_id, valor, notas, registado_por) VALUES (?,?,?,?,?)",
            (id, existing["projeto_id"], valor, notas, session.get("nome", session.get("username", ""))),
        )
        # Also update the current value on the indicator
        conn.execute(
            "UPDATE impacto_quadro_logico SET valor_atual=?, atualizado_em=? WHERE id=?",
            (valor, datetime.now().isoformat(timespec="seconds"), id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM impacto_quadro_logico_historico WHERE id=?", (cursor.lastrowid,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    rows = conn.execute(
        "SELECT * FROM impacto_quadro_logico_historico WHERE indicador_id=? ORDER BY criado_em ASC", (id,)
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


# ---------------------------------------------------------------------------
# Evidence linked to logframe indicators
# ---------------------------------------------------------------------------

@bp.route("/api/impact/logframe/<int:id>/evidencias", methods=["GET", "POST"])
@login_required
def api_impact_logframe_evidencias(id):
    conn = get_db()
    existing = conn.execute("SELECT * FROM impacto_quadro_logico WHERE id=?", (id,)).fetchone()
    if not existing:
        conn.close()
        return api_error("Indicador não encontrado", 404, "NOT_FOUND")
    access_error = require_project_access(conn, existing["projeto_id"])
    if access_error:
        conn.close()
        return access_error

    if request.method == "POST":
        permission_error = require_project_permission(conn, existing["projeto_id"], "membro")
        if permission_error:
            conn.close()
            return permission_error
        payload = request.get_json(silent=True) or {}
        descricao = str(payload.get("descricao") or "").strip()
        if not descricao:
            conn.close()
            return api_error("Descrição da evidência é obrigatória", 400, "VALIDATION_ERROR")
        tipo = str(payload.get("tipo") or "documento").strip()
        if tipo not in ("documento", "url", "relatorio"):
            tipo = "documento"
        documento_id = payload.get("documento_id")
        url_externa = str(payload.get("url_externa") or "").strip()
        cursor = conn.execute(
            "INSERT INTO indicador_evidencias (indicador_id, documento_id, descricao, url_externa, tipo, criado_por) VALUES (?,?,?,?,?,?)",
            (id, documento_id, descricao, url_externa, tipo, session.get("nome", session.get("username", ""))),
        )
        conn.commit()
        row = conn.execute(
            """SELECT e.*, d.nome AS documento_nome
               FROM indicador_evidencias e
               LEFT JOIN documentos d ON d.id = e.documento_id
               WHERE e.id=?""",
            (cursor.lastrowid,),
        ).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    rows = conn.execute(
        """SELECT e.*, d.nome AS documento_nome
           FROM indicador_evidencias e
           LEFT JOIN documentos d ON d.id = e.documento_id
           WHERE e.indicador_id=?
           ORDER BY e.criado_em DESC""",
        (id,),
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@bp.route("/api/impact/evidencias/<int:id>", methods=["DELETE"])
@login_required
def api_impact_evidencia_detail(id):
    conn = get_db()
    ev = conn.execute(
        """SELECT e.*, ql.projeto_id
           FROM indicador_evidencias e
           JOIN impacto_quadro_logico ql ON ql.id = e.indicador_id
           WHERE e.id=?""",
        (id,),
    ).fetchone()
    if not ev:
        conn.close()
        return api_error("Evidência não encontrada", 404, "NOT_FOUND")
    permission_error = require_project_permission(conn, ev["projeto_id"], "membro")
    if permission_error:
        conn.close()
        return permission_error
    conn.execute("DELETE FROM indicador_evidencias WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Evidência eliminada"})
