from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request

from coopgest.access import (
    can_access_project,
    color_for_name,
    ensure_project_skill_catalog,
    initials_from_name,
    require_project_permission,
    resolve_project_scope,
)
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.validators import validate_member_skill_payload, validate_skill_payload

bp = Blueprint("skills", __name__)


@bp.route("/api/skills", methods=["GET", "POST"])
@login_required
def api_skills():
    conn = get_db()
    if request.method == "POST":
        payload = request.get_json(silent=True)
        skill_data, errors = validate_skill_payload(payload)
        if errors:
            conn.close()
            return api_error("Payload inválido", 400, "VALIDATION_ERROR", errors)

        projeto_id, error_response = resolve_project_scope(conn, (payload or {}).get("projeto_id"), required=True)
        if error_response:
            conn.close()
            return error_response
        permission_error = require_project_permission(conn, projeto_id, "membro")
        if permission_error:
            conn.close()
            return permission_error

        cursor = conn.execute(
            """INSERT INTO competencias (nome, categoria, projeto_id, atualizado_em)
               VALUES (?, ?, ?, ?)""",
            (
                skill_data["nome"],
                skill_data["categoria"],
                projeto_id,
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        skill_id = cursor.lastrowid
        conn.commit()
        row = conn.execute("SELECT * FROM competencias WHERE id=?", (skill_id,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    projeto_id, error_response = resolve_project_scope(conn, request.args.get("projeto_id"), required=True)
    if error_response:
        conn.close()
        return error_response

    ensure_project_skill_catalog(conn, projeto_id)
    skills = [
        row_to_dict(row)
        for row in conn.execute(
            "SELECT * FROM competencias WHERE projeto_id=? ORDER BY nome ASC",
            (projeto_id,),
        ).fetchall()
    ]
    conn.close()
    return jsonify(skills)


@bp.route("/api/skills/members", methods=["GET"])
@login_required
def api_skill_members():
    conn = get_db()
    projeto_id, error_response = resolve_project_scope(conn, request.args.get("projeto_id"), required=True)
    if error_response:
        conn.close()
        return error_response

    members = []
    member_rows = conn.execute(
        """SELECT pm.user_id as id, u.nome, pm.papel
           FROM projeto_membros pm
           JOIN utilizadores u ON u.id = pm.user_id
           WHERE pm.projeto_id=?
           ORDER BY u.nome ASC""",
        (projeto_id,),
    ).fetchall()

    for member_row in member_rows:
        member = row_to_dict(member_row)
        member_skills = [
            row_to_dict(row)
            for row in conn.execute(
                """SELECT pmc.competencia_id, pmc.nivel, pmc.disposto_ensinar, pmc.quer_aprender
                   FROM projeto_membro_competencia pmc
                   WHERE pmc.projeto_id=? AND pmc.user_id=?""",
                (projeto_id, member["id"]),
            ).fetchall()
        ]

        member["iniciais"] = initials_from_name(member["nome"])
        member["cor"] = color_for_name(member["nome"])
        member["disponibilidade"] = 100
        member["skills"] = [
            {
                "skillId": str(item["competencia_id"]),
                "level": int(item["nivel"]),
                "willingToTeach": bool(item["disposto_ensinar"]),
                "wantsToLearn": bool(item["quer_aprender"]),
            }
            for item in member_skills
        ]
        members.append(member)

    conn.close()
    return jsonify(members)


@bp.route("/api/skills/members/<int:member_id>/skills", methods=["POST"])
@login_required
def api_member_add_or_update_skill(member_id):
    payload = request.get_json(silent=True)
    skill_data, errors = validate_member_skill_payload(payload)
    if errors:
        return api_error("Payload inválido", 400, "VALIDATION_ERROR", errors)

    conn = get_db()
    projeto_id, error_response = resolve_project_scope(conn, (payload or {}).get("projeto_id"), required=True)
    if error_response:
        conn.close()
        return error_response
    permission_error = require_project_permission(conn, projeto_id, "membro")
    if permission_error:
        conn.close()
        return permission_error

    member = conn.execute(
        "SELECT id FROM projeto_membros WHERE projeto_id=? AND user_id=?",
        (projeto_id, member_id),
    ).fetchone()
    if not member:
        conn.close()
        return api_error("Membro não encontrado", 404, "NOT_FOUND")

    skill = conn.execute(
        "SELECT id FROM competencias WHERE id=? AND projeto_id=?",
        (skill_data["competencia_id"], projeto_id),
    ).fetchone()
    if not skill:
        conn.close()
        return api_error("Competência não encontrada", 404, "NOT_FOUND")

    conn.execute(
        """INSERT INTO projeto_membro_competencia
           (projeto_id, user_id, competencia_id, nivel, disposto_ensinar, quer_aprender, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(projeto_id, user_id, competencia_id)
           DO UPDATE SET
             nivel=excluded.nivel,
             disposto_ensinar=excluded.disposto_ensinar,
             quer_aprender=excluded.quer_aprender,
             atualizado_em=excluded.atualizado_em""",
        (
            projeto_id,
            member_id,
            skill_data["competencia_id"],
            skill_data["nivel"],
            1 if skill_data["disposto_ensinar"] else 0,
            1 if skill_data["quer_aprender"] else 0,
            datetime.now().isoformat(timespec="seconds"),
        ),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Competência atribuída/atualizada com sucesso"})


@bp.route("/api/skills/members/<int:member_id>/skills/<int:skill_id>", methods=["DELETE"])
@login_required
def api_member_remove_skill(member_id, skill_id):
    conn = get_db()
    projeto_id, error_response = resolve_project_scope(conn, request.args.get("projeto_id"), required=True)
    if error_response:
        conn.close()
        return error_response
    permission_error = require_project_permission(conn, projeto_id, "membro")
    if permission_error:
        conn.close()
        return permission_error

    existing = conn.execute(
        "SELECT * FROM projeto_membro_competencia WHERE projeto_id=? AND user_id=? AND competencia_id=?",
        (projeto_id, member_id, skill_id),
    ).fetchone()
    if not existing:
        conn.close()
        return api_error("Relação membro-competência não encontrada", 404, "NOT_FOUND")

    conn.execute(
        "DELETE FROM projeto_membro_competencia WHERE projeto_id=? AND user_id=? AND competencia_id=?",
        (projeto_id, member_id, skill_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Competência removida do membro com sucesso"})


@bp.route("/api/skills/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_skill_detail(id):
    if request.method == "DELETE":
        conn = get_db()
        existing = conn.execute("SELECT id, projeto_id FROM competencias WHERE id=?", (id,)).fetchone()
        if not existing:
            conn.close()
            return api_error("Competência não encontrada", 404, "NOT_FOUND")
        if existing["projeto_id"] and not can_access_project(conn, existing["projeto_id"]):
            conn.close()
            return api_error("Sem acesso a este projeto", 403, "FORBIDDEN")

        conn.execute("DELETE FROM competencias WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Competência eliminada com sucesso"})

    payload = request.get_json(silent=True)
    skill_data, errors = validate_skill_payload(payload, partial=True)
    if errors:
        return api_error("Payload inválido", 400, "VALIDATION_ERROR", errors)

    updates = [
        (field, value)
        for field, value in [
            ("nome", skill_data.get("nome")),
            ("categoria", skill_data.get("categoria")),
        ]
        if value is not None
    ]
    updates.append(("atualizado_em", datetime.now().isoformat(timespec="seconds")))
    if len(updates) == 1:
        return api_error("Nenhum campo para atualizar", 400, "VALIDATION_ERROR")

    conn = get_db()
    existing = conn.execute("SELECT id, projeto_id FROM competencias WHERE id=?", (id,)).fetchone()
    if not existing:
        conn.close()
        return api_error("Competência não encontrada", 404, "NOT_FOUND")
    if existing["projeto_id"] and not can_access_project(conn, existing["projeto_id"]):
        conn.close()
        return api_error("Sem acesso a este projeto", 403, "FORBIDDEN")

    set_clause = ", ".join([f"{field}=?" for field, _ in updates])
    values = [value for _, value in updates]
    values.append(id)
    conn.execute(f"UPDATE competencias SET {set_clause} WHERE id=?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM competencias WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))

