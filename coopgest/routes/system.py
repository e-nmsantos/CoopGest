from datetime import datetime
import os

from flask import Blueprint, jsonify, session

from coopgest.config import UPLOAD_FOLDER
from coopgest.db import get_db
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("system", __name__)


@bp.route("/api/health")
def api_health():
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    })


@bp.route("/api/system/reset-data", methods=["POST"])
@login_required
def api_reset_data():
    if session.get("papel") != "admin":
        return api_error("Acesso reservado a administradores", 403, "FORBIDDEN")

    tables = [
        "indicador_evidencias",
        "impacto_quadro_logico_historico",
        "impacto_metricas_historico",
        "orcamento_revisoes",
        "membro_competencia",
        "projeto_membro_competencia",
        "tarefa_dependencias",
        "subtarefas",
        "registos_horas",
        "chat_messages",
        "comentarios",
        "votos",
        "votacoes",
        "feedbacks",
        "feedback_tokens",
        "licoes_aprendidas",
        "methodkit_seleccoes",
        "analise_pest",
        "analise_swot",
        "arvore_problemas",
        "plano_avaliacao",
        "documentos",
        "movimentos_financeiros",
        "procurement",
        "fontes_financiamento",
        "orcamento",
        "beneficiarios_desagregacao",
        "beneficiarios",
        "riscos",
        "milestones",
        "tarefas",
        "stakeholders",
        "impacto_quadro_logico",
        "impacto_metricas",
        "projeto_parceiro",
        "projeto_membros",
        "projetos",
        "parceiros",
        "competencias",
        "equipa_membros",
        "template_tarefas",
        "template_milestones",
        "template_orcamento",
        "templates",
        "notificacoes",
        "convites",
        "password_reset_tokens",
    ]

    conn = get_db()
    deleted = {}
    for table in tables:
        try:
            deleted[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            conn.execute(f"DELETE FROM {table}")
        except Exception:
            deleted[table] = 0
    conn.execute("DELETE FROM utilizadores WHERE papel != 'admin'")
    try:
        names = ", ".join(["?"] * (len(tables) + 1))
        conn.execute(
            f"DELETE FROM sqlite_sequence WHERE name IN ({names})",
            tables + ["utilizadores"],
        )
    except Exception:
        pass
    conn.commit()
    conn.close()

    removed_uploads = 0
    if os.path.isdir(UPLOAD_FOLDER):
        for name in os.listdir(UPLOAD_FOLDER):
            path = os.path.join(UPLOAD_FOLDER, name)
            if os.path.isfile(path):
                try:
                    os.remove(path)
                    removed_uploads += 1
                except OSError:
                    pass

    return jsonify({
        "message": "Dados limpos com sucesso",
        "deleted": deleted,
        "removed_uploads": removed_uploads,
    })
