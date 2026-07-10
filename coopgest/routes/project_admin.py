from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request, session

from coopgest.access import require_project_access, require_project_permission
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit

bp = Blueprint("project_admin", __name__)


@bp.route("/api/projects/<int:projeto_id>/team", methods=["GET", "POST"])
@login_required
def api_project_team(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error
    if request.method == "POST":
        permission_error = require_project_permission(conn, projeto_id, "gestor")
        if permission_error:
            conn.close()
            return permission_error
        payload = request.get_json(silent=True) or {}
        user_id = int(payload.get("user_id", 0) or 0)
        papel = payload.get("papel", "membro")
        if not user_id:
            conn.close()
            return api_error("user_id obrigatório", 400, "VALIDATION_ERROR")
        try:
            member = conn.execute("SELECT nome, username FROM utilizadores WHERE id=?", (user_id,)).fetchone()
            conn.execute(
                "INSERT OR REPLACE INTO projeto_membros (projeto_id, user_id, papel) VALUES (?,?,?)",
                (projeto_id, user_id, papel),
            )
            member_name = member["nome"] if member else f"Utilizador #{user_id}"
            log_audit(conn, "adicionou_membro", "equipa", user_id, f"{member_name} como {papel}", projeto_id)
            conn.commit()
        except Exception as exc:
            current_app.logger.error("Erro ao adicionar membro ao projeto %s: %s", projeto_id, exc)
            conn.close()
            return api_error("Erro ao adicionar membro", 500, "SERVER_ERROR")
        conn.close()
        return jsonify({"message": "Membro adicionado"}), 201

    rows = [row_to_dict(row) for row in conn.execute(
        """SELECT pm.*, u.nome, u.nome as user_nome, u.username, u.papel as papel_global
           FROM projeto_membros pm
           JOIN utilizadores u ON pm.user_id = u.id
           WHERE pm.projeto_id=?""",
        (projeto_id,),
    ).fetchall()]
    conn.close()
    return jsonify(rows)


@bp.route("/api/projects/<int:projeto_id>/team/<int:user_id>", methods=["DELETE"])
@login_required
def api_project_team_delete(projeto_id, user_id):
    conn = get_db()
    access_error = require_project_permission(conn, projeto_id, "gestor")
    if access_error:
        conn.close()
        return access_error
    member = conn.execute("SELECT nome, username FROM utilizadores WHERE id=?", (user_id,)).fetchone()
    member_name = member["nome"] if member else f"Utilizador #{user_id}"
    log_audit(conn, "removeu_membro", "equipa", user_id, member_name, projeto_id)
    conn.execute("DELETE FROM projeto_membros WHERE projeto_id=? AND user_id=?", (projeto_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Membro removido"})


@bp.route("/api/projects/<int:id>/archive", methods=["POST"])
@login_required
def api_project_archive(id):
    conn = get_db()
    access_error = require_project_access(conn, id)
    if access_error:
        conn.close()
        return access_error
    row = conn.execute("SELECT arquivado FROM projetos WHERE id=?", (id,)).fetchone()
    if not row:
        conn.close()
        return api_error("Projeto não encontrado", 404, "NOT_FOUND")
    new_state = 0 if row["arquivado"] else 1
    conn.execute("UPDATE projetos SET arquivado=? WHERE id=?", (new_state, id))
    log_audit(conn, "arquivado" if new_state else "restaurado", "projeto", id, "", id)
    conn.commit()
    conn.close()
    return jsonify({"arquivado": bool(new_state)})


@bp.route("/api/projects/<int:id>/duplicate", methods=["POST"])
@login_required
def api_project_duplicate(id):
    conn = get_db()
    access_error = require_project_access(conn, id)
    if access_error:
        conn.close()
        return access_error
    orig = conn.execute("SELECT * FROM projetos WHERE id=?", (id,)).fetchone()
    if not orig:
        conn.close()
        return api_error("Projeto não encontrado", 404, "NOT_FOUND")
    cursor = conn.execute(
        "INSERT INTO projetos (nome, descricao, objetivos, data_inicio, data_fim, estado) VALUES (?,?,?,?,?,?)",
        (f"{orig['nome']} (cópia)", orig["descricao"], orig["objetivos"], orig["data_inicio"], orig["data_fim"], "Planeamento"),
    )
    new_id = cursor.lastrowid
    conn.execute(
        "INSERT OR IGNORE INTO projeto_membros (projeto_id, user_id, papel) VALUES (?,?,?)",
        (new_id, session["user_id"], "gestor"),
    )
    for milestone in conn.execute("SELECT * FROM milestones WHERE projeto_id=?", (id,)).fetchall():
        conn.execute(
            "INSERT INTO milestones (projeto_id, nome, descricao, data_prevista, estado) VALUES (?,?,?,?,?)",
            (new_id, milestone["nome"], milestone["descricao"], milestone["data_prevista"], "Pendente"),
        )
    for budget in conn.execute("SELECT * FROM orcamento WHERE projeto_id=?", (id,)).fetchall():
        conn.execute(
            "INSERT INTO orcamento (projeto_id, tipo, categoria, descricao, valor_previsto, valor_real) VALUES (?,?,?,?,?,0)",
            (new_id, budget["tipo"], budget["categoria"], budget["descricao"], budget["valor_previsto"]),
        )
    log_audit(conn, "duplicado", "projeto", new_id, f"Cópia de projeto {id}", new_id)
    conn.commit()
    novo = row_to_dict(conn.execute("SELECT * FROM projetos WHERE id=?", (new_id,)).fetchone())
    conn.close()
    return jsonify(novo), 201


@bp.route("/api/audit")
@login_required
def api_audit():
    conn = get_db()
    projeto_id = request.args.get("projeto_id")
    entidade = request.args.get("entidade")
    limit = int(request.args.get("limit", 100))
    query = "SELECT * FROM auditoria WHERE 1=1"
    params = []
    if projeto_id:
        query += " AND (projeto_id=? OR (entidade_id=? AND entidade='projeto'))"
        params.append(int(projeto_id))
        params.append(int(projeto_id))
    if entidade:
        query += " AND entidade=?"
        params.append(entidade)
    query += " ORDER BY criado_em DESC LIMIT ?"
    params.append(limit)
    rows = [row_to_dict(row) for row in conn.execute(query, params).fetchall()]
    conn.close()
    return jsonify(rows)


@bp.route("/api/projects/<int:projeto_id>/activity")
@login_required
def api_project_activity(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error
    limit = min(int(request.args.get("limit", 80) or 80), 200)
    rows = conn.execute(
        """SELECT DISTINCT a.*
           FROM auditoria a
           LEFT JOIN tarefas t ON a.entidade='tarefa' AND a.entidade_id=t.id
           WHERE a.projeto_id = ?
              OR (a.entidade='projeto' AND a.entidade_id = ?)
              OR t.projeto_id = ?
           ORDER BY a.criado_em DESC
           LIMIT ?""",
        (projeto_id, projeto_id, projeto_id, limit),
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])

