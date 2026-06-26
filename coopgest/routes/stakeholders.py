"""
Stakeholder management routes — analysis matrix + CRUD.
"""
from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from coopgest.access import require_project_permission
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("stakeholders", __name__)

_NIVEIS = ("Alto", "Médio", "Baixo")
_POSICOES = ("Apoiante", "Neutro", "Oponente")


# ── Meta ─────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/stakeholders/meta", methods=["GET"])
@login_required
def stakeholders_meta(projeto_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err
        return jsonify({"niveis": list(_NIVEIS), "posicoes": list(_POSICOES)})
    finally:
        conn.close()


# ── Matrix ────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/stakeholders/matrix", methods=["GET"])
@login_required
def stakeholders_matrix(projeto_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err

        rows = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM stakeholders WHERE projeto_id=? ORDER BY nome",
                (projeto_id,),
            ).fetchall()
        ]

        matrix = {
            "gerir_de_perto": [],
            "manter_satisfeito": [],
            "manter_informado": [],
            "monitorizar": [],
        }
        for sk in rows:
            interesse = sk.get("interesse", "Médio")
            influencia = sk.get("influencia", "Médio")
            alto_interesse = interesse == "Alto"
            alto_influencia = influencia == "Alto"
            if alto_interesse and alto_influencia:
                matrix["gerir_de_perto"].append(sk)
            elif not alto_interesse and alto_influencia:
                matrix["manter_satisfeito"].append(sk)
            elif alto_interesse and not alto_influencia:
                matrix["manter_informado"].append(sk)
            else:
                matrix["monitorizar"].append(sk)

        return jsonify(matrix)
    finally:
        conn.close()


# ── List ──────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/stakeholders", methods=["GET"])
@login_required
def list_stakeholders(projeto_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err

        rows = [
            row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM stakeholders WHERE projeto_id=? ORDER BY nome",
                (projeto_id,),
            ).fetchall()
        ]
        return jsonify(rows)
    finally:
        conn.close()


# ── Create ────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/stakeholders", methods=["POST"])
@login_required
def create_stakeholder(projeto_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err

        data = request.get_json(silent=True) or {}
        nome = (data.get("nome") or "").strip()
        if not nome:
            return api_error("Campo 'nome' é obrigatório", 400, "VALIDATION_ERROR")

        interesse = data.get("interesse", "Médio")
        influencia = data.get("influencia", "Médio")
        posicao = data.get("posicao", "Neutro")

        if interesse not in _NIVEIS:
            return api_error(f"'interesse' inválido. Valores aceites: {', '.join(_NIVEIS)}", 400, "VALIDATION_ERROR")
        if influencia not in _NIVEIS:
            return api_error(f"'influencia' inválida. Valores aceites: {', '.join(_NIVEIS)}", 400, "VALIDATION_ERROR")
        if posicao not in _POSICOES:
            return api_error(f"'posicao' inválida. Valores aceites: {', '.join(_POSICOES)}", 400, "VALIDATION_ERROR")

        criado_por = session.get("username", "")
        cur = conn.execute(
            """INSERT INTO stakeholders
               (projeto_id, nome, organizacao, papel, interesse, influencia, posicao,
                estrategia, contacto, notas, criado_por)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                projeto_id,
                nome,
                data.get("organizacao", ""),
                data.get("papel", ""),
                interesse,
                influencia,
                posicao,
                data.get("estrategia", ""),
                data.get("contacto", ""),
                data.get("notas", ""),
                criado_por,
            ),
        )
        conn.commit()
        new_id = cur.lastrowid
        row = row_to_dict(
            conn.execute("SELECT * FROM stakeholders WHERE id=?", (new_id,)).fetchone()
        )
        return jsonify(row), 201
    finally:
        conn.close()


# ── Update ────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/stakeholders/<int:sk_id>", methods=["PUT"])
@login_required
def update_stakeholder(projeto_id: int, sk_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err

        existing = conn.execute(
            "SELECT id FROM stakeholders WHERE id=? AND projeto_id=?", (sk_id, projeto_id)
        ).fetchone()
        if not existing:
            return api_error("Stakeholder não encontrado", 404, "NOT_FOUND")

        data = request.get_json(silent=True) or {}
        allowed = ("nome", "organizacao", "papel", "interesse", "influencia",
                   "posicao", "estrategia", "contacto", "notas")

        updates: dict[str, object] = {}
        for field in allowed:
            if field in data:
                updates[field] = data[field]

        if "interesse" in updates and updates["interesse"] not in _NIVEIS:
            return api_error(f"'interesse' inválido. Valores aceites: {', '.join(_NIVEIS)}", 400, "VALIDATION_ERROR")
        if "influencia" in updates and updates["influencia"] not in _NIVEIS:
            return api_error(f"'influencia' inválida. Valores aceites: {', '.join(_NIVEIS)}", 400, "VALIDATION_ERROR")
        if "posicao" in updates and updates["posicao"] not in _POSICOES:
            return api_error(f"'posicao' inválida. Valores aceites: {', '.join(_POSICOES)}", 400, "VALIDATION_ERROR")
        if "nome" in updates and not str(updates["nome"]).strip():
            return api_error("Campo 'nome' não pode estar vazio", 400, "VALIDATION_ERROR")

        if not updates:
            row = row_to_dict(conn.execute("SELECT * FROM stakeholders WHERE id=?", (sk_id,)).fetchone())
            return jsonify(row)

        set_clause = ", ".join(f"{k}=?" for k in updates)
        set_clause += ", atualizado_em=CURRENT_TIMESTAMP"
        conn.execute(
            f"UPDATE stakeholders SET {set_clause} WHERE id=?",
            (*updates.values(), sk_id),
        )
        conn.commit()
        row = row_to_dict(conn.execute("SELECT * FROM stakeholders WHERE id=?", (sk_id,)).fetchone())
        return jsonify(row)
    finally:
        conn.close()


# ── Delete ────────────────────────────────────────────────────────────────────

@bp.route("/api/projects/<int:projeto_id>/stakeholders/<int:sk_id>", methods=["DELETE"])
@login_required
def delete_stakeholder(projeto_id: int, sk_id: int):
    conn = get_db()
    try:
        err = require_project_permission(conn, projeto_id, "membro")
        if err:
            return err

        existing = conn.execute(
            "SELECT id FROM stakeholders WHERE id=? AND projeto_id=?", (sk_id, projeto_id)
        ).fetchone()
        if not existing:
            return api_error("Stakeholder não encontrado", 404, "NOT_FOUND")

        conn.execute("DELETE FROM stakeholders WHERE id=?", (sk_id,))
        conn.commit()
        return jsonify({"deleted": True, "id": sk_id})
    finally:
        conn.close()
