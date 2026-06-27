"""
Procurement routes — CRUD for the procurement table.
"""
from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request, session

from coopgest.access import require_project_permission
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("procurement", __name__)

ALLOWED_TIPOS = ("Bens", "Serviços", "Obras", "Consultoria")
ALLOWED_ESTADOS = (
    "A identificar",
    "Em preparação",
    "A concurso",
    "Adjudicado",
    "Em execução",
    "Concluído",
    "Cancelado",
)


# ── Meta ───────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/procurement/meta", methods=["GET"])
@login_required
def procurement_meta(projeto_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err
        return jsonify({"tipos": list(ALLOWED_TIPOS), "estados": list(ALLOWED_ESTADOS)})
    finally:
        conn.close()


# ── List ───────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/procurement", methods=["GET"])
@login_required
def list_procurement(projeto_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err

        estado_filter = request.args.get("estado")
        tipo_filter = request.args.get("tipo")

        query = "SELECT * FROM procurement WHERE projeto_id=?"
        params: list = [projeto_id]

        if estado_filter:
            if estado_filter not in ALLOWED_ESTADOS:
                return api_error("Estado inválido", 400, "VALIDATION_ERROR")
            query += " AND estado=?"
            params.append(estado_filter)

        if tipo_filter:
            if tipo_filter not in ALLOWED_TIPOS:
                return api_error("Tipo inválido", 400, "VALIDATION_ERROR")
            query += " AND tipo=?"
            params.append(tipo_filter)

        query += " ORDER BY criado_em DESC"
        rows = [row_to_dict(r) for r in conn.execute(query, params).fetchall()]
        return jsonify(rows)
    finally:
        conn.close()


# ── Create ─────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/procurement", methods=["POST"])
@login_required
def create_procurement(projeto_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err

        data = request.get_json(silent=True) or {}

        titulo = (data.get("titulo") or "").strip()
        if not titulo:
            return api_error("O campo 'titulo' é obrigatório", 400, "VALIDATION_ERROR")

        tipo = data.get("tipo", "Serviços")
        if tipo not in ALLOWED_TIPOS:
            return api_error(
                f"Tipo inválido. Valores aceites: {', '.join(ALLOWED_TIPOS)}",
                400, "VALIDATION_ERROR",
            )

        estado = data.get("estado", "A identificar")
        if estado not in ALLOWED_ESTADOS:
            return api_error(
                f"Estado inválido. Valores aceites: {', '.join(ALLOWED_ESTADOS)}",
                400, "VALIDATION_ERROR",
            )

        now = datetime.now().isoformat(timespec="seconds")
        criado_por = session.get("username", "")

        cursor = conn.execute(
            """INSERT INTO procurement (
                projeto_id, titulo, descricao, tipo,
                valor_estimado, valor_real, moeda, estado,
                data_lancamento, data_adjudicacao, fornecedor,
                numero_referencia, notas, criado_por, criado_em, atualizado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                projeto_id,
                titulo,
                data.get("descricao", ""),
                tipo,
                float(data.get("valor_estimado") or 0),
                float(data.get("valor_real") or 0),
                data.get("moeda", "EUR"),
                estado,
                data.get("data_lancamento", ""),
                data.get("data_adjudicacao", ""),
                data.get("fornecedor", ""),
                data.get("numero_referencia", ""),
                data.get("notas", ""),
                criado_por,
                now,
                now,
            ),
        )
        conn.commit()

        new_row = row_to_dict(
            conn.execute("SELECT * FROM procurement WHERE id=?", (cursor.lastrowid,)).fetchone()
        )
        return jsonify(new_row), 201
    finally:
        conn.close()


# ── Update ─────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/procurement/<int:item_id>", methods=["PUT"])
@login_required
def update_procurement(projeto_id: int, item_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err

        item = conn.execute(
            "SELECT * FROM procurement WHERE id=? AND projeto_id=?", (item_id, projeto_id)
        ).fetchone()
        if not item:
            return api_error("Item de procurement não encontrado", 404, "NOT_FOUND")

        data = request.get_json(silent=True) or {}

        # Validate optional enum fields if provided
        if "tipo" in data and data["tipo"] not in ALLOWED_TIPOS:
            return api_error(
                f"Tipo inválido. Valores aceites: {', '.join(ALLOWED_TIPOS)}",
                400, "VALIDATION_ERROR",
            )
        if "estado" in data and data["estado"] not in ALLOWED_ESTADOS:
            return api_error(
                f"Estado inválido. Valores aceites: {', '.join(ALLOWED_ESTADOS)}",
                400, "VALIDATION_ERROR",
            )

        current = row_to_dict(item)
        now = datetime.now().isoformat(timespec="seconds")

        conn.execute(
            """UPDATE procurement SET
                titulo=?, descricao=?, tipo=?,
                valor_estimado=?, valor_real=?, moeda=?, estado=?,
                data_lancamento=?, data_adjudicacao=?, fornecedor=?,
                numero_referencia=?, notas=?, atualizado_em=?
            WHERE id=? AND projeto_id=?""",
            (
                data.get("titulo", current["titulo"]),
                data.get("descricao", current["descricao"]),
                data.get("tipo", current["tipo"]),
                float(data.get("valor_estimado", current["valor_estimado"]) or 0),
                float(data.get("valor_real", current["valor_real"]) or 0),
                data.get("moeda", current["moeda"]),
                data.get("estado", current["estado"]),
                data.get("data_lancamento", current["data_lancamento"]),
                data.get("data_adjudicacao", current["data_adjudicacao"]),
                data.get("fornecedor", current["fornecedor"]),
                data.get("numero_referencia", current["numero_referencia"]),
                data.get("notas", current["notas"]),
                now,
                item_id,
                projeto_id,
            ),
        )
        conn.commit()

        updated = row_to_dict(
            conn.execute("SELECT * FROM procurement WHERE id=?", (item_id,)).fetchone()
        )
        return jsonify(updated)
    finally:
        conn.close()


# ── Delete ─────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/procurement/<int:item_id>", methods=["DELETE"])
@login_required
def delete_procurement(projeto_id: int, item_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err

        item = conn.execute(
            "SELECT id FROM procurement WHERE id=? AND projeto_id=?", (item_id, projeto_id)
        ).fetchone()
        if not item:
            return api_error("Item de procurement não encontrado", 404, "NOT_FOUND")

        conn.execute("DELETE FROM procurement WHERE id=? AND projeto_id=?", (item_id, projeto_id))
        conn.commit()
        return jsonify({"message": "Eliminado com sucesso"})
    finally:
        conn.close()
