from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from coopgest.access import can_access_project, resolve_project_scope
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit
from coopgest.services.email import send_email

bp = Blueprint("voting", __name__)


def _votacao_to_dict(row, votos_rows, total_members=1):
    data = row_to_dict(row)
    return {
        "id": str(data["id"]),
        "projectId": data.get("projeto_id"),
        "title": data.get("titulo", ""),
        "description": data.get("descricao", "") or "",
        "proposedBy": data.get("proposta_por", ""),
        "createdAt": data.get("criado_em", ""),
        "deadline": data.get("prazo", ""),
        "status": data.get("estado", "aberta"),
        "quorum": data.get("quorum", 50),
        "threshold": data.get("threshold", 66),
        "totalMembers": total_members,
        "votes": [
            {
                "userId": vote["username"],
                "userName": vote["nome"],
                "vote": vote["voto"],
                "timestamp": vote["criado_em"],
            }
            for vote in [row_to_dict(vote_row) for vote_row in votos_rows]
        ],
    }


@bp.route("/api/votacoes", methods=["GET", "POST"])
@login_required
def api_votacoes():
    if request.method == "POST":
        payload = request.get_json(silent=True)
        if not payload or not str(payload.get("title", "")).strip():
            return api_error("Título é obrigatório", 400, "VALIDATION_ERROR")
        if not str(payload.get("deadline", "")).strip():
            return api_error("Prazo é obrigatório", 400, "VALIDATION_ERROR")

        proposta_por = session.get("nome", session.get("username", "Admin"))
        conn = get_db()
        projeto_id, error_response = resolve_project_scope(conn, (payload or {}).get("projeto_id"))
        if error_response:
            conn.close()
            return error_response

        titulo = payload["title"].strip()
        cursor = conn.execute(
            "INSERT INTO votacoes (titulo, descricao, proposta_por, quorum, threshold, prazo, projeto_id) VALUES (?,?,?,?,?,?,?)",
            (
                titulo,
                payload.get("description", "") or "",
                proposta_por,
                int(payload.get("quorum", 50)),
                int(payload.get("threshold", 66)),
                payload["deadline"].strip(),
                projeto_id,
            ),
        )
        new_id = cursor.lastrowid
        log_audit(conn, "criou_votacao", "votacao", new_id, titulo, projeto_id)
        conn.commit()
        row = conn.execute("SELECT * FROM votacoes WHERE id=?", (new_id,)).fetchone()

        if projeto_id is not None:
            total = conn.execute("SELECT COUNT(*) FROM projeto_membros WHERE projeto_id=?", (projeto_id,)).fetchone()[0]
            usernames = [
                row["username"]
                for row in conn.execute(
                    """SELECT u.username
                       FROM projeto_membros pm
                       JOIN utilizadores u ON u.id = pm.user_id
                       WHERE pm.projeto_id=?""",
                    (projeto_id,),
                ).fetchall()
            ]
        else:
            total = conn.execute("SELECT COUNT(*) FROM utilizadores").fetchone()[0]
            usernames = [
                user["username"]
                for user in [row_to_dict(row) for row in conn.execute("SELECT username FROM utilizadores").fetchall()]
            ]
        conn.close()

        send_email(
            usernames,
            f"Nova votação: {titulo}",
            f'Foi criada uma nova proposta de votação: "{titulo}"\n\nAceda à plataforma para votar.',
        )
        return jsonify(_votacao_to_dict(row, [], total)), 201

    conn = get_db()
    projeto_id, error_response = resolve_project_scope(conn, request.args.get("projeto_id"))
    if error_response:
        conn.close()
        return error_response

    if projeto_id is not None:
        votacoes_rows = conn.execute(
            "SELECT * FROM votacoes WHERE projeto_id=? ORDER BY criado_em DESC",
            (projeto_id,),
        ).fetchall()
    else:
        votacoes_rows = conn.execute("SELECT * FROM votacoes ORDER BY criado_em DESC").fetchall()

    result = []
    for votacao in votacoes_rows:
        total_members = (
            conn.execute("SELECT COUNT(*) FROM projeto_membros WHERE projeto_id=?", (votacao["projeto_id"],)).fetchone()[0]
            if votacao["projeto_id"] is not None
            else conn.execute("SELECT COUNT(*) FROM utilizadores").fetchone()[0]
        )
        votos = conn.execute("SELECT * FROM votos WHERE votacao_id=?", (votacao["id"],)).fetchall()
        result.append(_votacao_to_dict(votacao, votos, total_members))
    conn.close()
    return jsonify(result)


@bp.route("/api/votacoes/<int:id>/votar", methods=["POST"])
@login_required
def api_votacao_votar(id):
    payload = request.get_json(silent=True)
    if not payload or payload.get("vote") not in ("sim", "nao", "abstencao"):
        return api_error("Voto inválido. Use: sim, nao, abstencao", 400, "VALIDATION_ERROR")

    conn = get_db()
    votacao = conn.execute("SELECT * FROM votacoes WHERE id=?", (id,)).fetchone()
    if not votacao:
        conn.close()
        return api_error("Votação não encontrada", 404, "NOT_FOUND")
    if votacao["projeto_id"] and not can_access_project(conn, votacao["projeto_id"]):
        conn.close()
        return api_error("Sem acesso a este projeto", 403, "FORBIDDEN")
    if votacao["estado"] != "aberta":
        conn.close()
        return api_error("Esta votação já não está aberta", 400, "BAD_REQUEST")

    username = session.get("username", "")
    nome = session.get("nome", username)
    existing_vote = conn.execute(
        "SELECT id FROM votos WHERE votacao_id=? AND username=?",
        (id, username),
    ).fetchone()
    if existing_vote:
        conn.close()
        return api_error("Já votou nesta proposta", 400, "ALREADY_VOTED")

    conn.execute(
        "INSERT INTO votos (votacao_id, username, nome, voto) VALUES (?,?,?,?)",
        (id, username, nome, payload["vote"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Voto registado com sucesso"})


@bp.route("/api/votacoes/<int:id>", methods=["DELETE"])
@login_required
def api_votacao_detail(id):
    conn = get_db()
    existing = conn.execute("SELECT id, projeto_id FROM votacoes WHERE id=?", (id,)).fetchone()
    if not existing:
        conn.close()
        return api_error("Votação não encontrada", 404, "NOT_FOUND")
    if existing["projeto_id"] and not can_access_project(conn, existing["projeto_id"]):
        conn.close()
        return api_error("Sem acesso a este projeto", 403, "FORBIDDEN")
    conn.execute("DELETE FROM votacoes WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Votação eliminada com sucesso"})


