import os
from flask import session
from coopgest.config import PROJECT_ROLE_RANK, DEFAULT_PROJECT_SKILLS


def project_role_allows(role, minimum_role):
    if role == "admin":
        return True
    return PROJECT_ROLE_RANK.get(role or "", 0) >= PROJECT_ROLE_RANK.get(minimum_role, 0)


def initials_from_name(name):
    return "".join([part[:1].upper() for part in str(name).split()[:2]]) or "??"


def color_for_name(name):
    h = 0
    for char in str(name):
        h = (h * 31 + ord(char)) & 0xFFFFFFFF
    from coopgest.config import SKILL_MEMBER_COLORS
    return SKILL_MEMBER_COLORS[abs(h) % len(SKILL_MEMBER_COLORS)]


def can_access_project(conn, projeto_id):
    """Verifica se o utilizador actual pode aceder a este projecto.
    Projectos privados só são acessíveis a membros e admins."""
    if session.get("papel") == "admin":
        return True
    proj = conn.execute("SELECT privado FROM projetos WHERE id=?", (projeto_id,)).fetchone()
    if not proj or not proj["privado"]:
        return True
    user = conn.execute("SELECT id FROM utilizadores WHERE username=?", (session.get("username", ""),)).fetchone()
    if not user:
        return False
    member = conn.execute(
        "SELECT id FROM projeto_membros WHERE projeto_id=? AND user_id=?",
        (projeto_id, user["id"]),
    ).fetchone()
    return member is not None


def get_project_role(conn, projeto_id):
    if session.get("papel") == "admin":
        return "admin"
    user_id = session.get("user_id")
    if not user_id:
        return None
    row = conn.execute(
        "SELECT papel FROM projeto_membros WHERE projeto_id=? AND user_id=?",
        (projeto_id, user_id),
    ).fetchone()
    if row:
        return row["papel"] or "membro"
    project = conn.execute("SELECT privado FROM projetos WHERE id=?", (projeto_id,)).fetchone()
    if project and not project["privado"]:
        return "leitor"
    return None


def require_project_access(conn, projeto_id):
    project = conn.execute("SELECT id FROM projetos WHERE id=?", (projeto_id,)).fetchone()
    if not project:
        from coopgest.http_helpers import api_error
        return api_error("Projeto não encontrado", 404, "NOT_FOUND")
    if not can_access_project(conn, projeto_id):
        from coopgest.http_helpers import api_error
        return api_error("Sem acesso a este projeto", 403, "FORBIDDEN")
    return None


def require_project_permission(conn, projeto_id, minimum_role="membro"):
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        return access_error
    role = get_project_role(conn, projeto_id)
    if not project_role_allows(role, minimum_role):
        from coopgest.http_helpers import api_error
        return api_error("Permissão insuficiente para esta ação", 403, "FORBIDDEN", {
            "required_role": minimum_role,
            "current_role": role or "sem_acesso",
        })
    return None


def filter_accessible_projects(conn, rows):
    return [row for row in rows if can_access_project(conn, row["id"])]


def require_row_project_access(conn, table, row_id, missing_message, minimum_role=None):
    allowed_tables = {
        "tarefas", "milestones", "orcamento", "fontes_financiamento", "comentarios",
        "riscos", "beneficiarios", "registos_horas", "chat_messages", "feedback_tokens"
    }
    if table not in allowed_tables:
        from coopgest.http_helpers import api_error
        return None, api_error("Tabela inválida", 500, "INTERNAL_ERROR")
    row = conn.execute(f"SELECT * FROM {table} WHERE id=?", (row_id,)).fetchone()
    if not row:
        from coopgest.http_helpers import api_error
        return None, api_error(missing_message, 404, "NOT_FOUND")
    project_id = row["projeto_id"]
    if minimum_role:
        access_error = require_project_permission(conn, project_id, minimum_role)
    else:
        access_error = require_project_access(conn, project_id)
    if access_error:
        return None, access_error
    return row, None


def require_task_access(conn, task_id, minimum_role=None):
    return require_row_project_access(conn, "tarefas", task_id, "Tarefa não encontrada", minimum_role)


def require_subtask_access(conn, subtask_id, minimum_role=None):
    row = conn.execute(
        """SELECT s.*, t.projeto_id
           FROM subtarefas s
           JOIN tarefas t ON t.id = s.tarefa_id
           WHERE s.id=?""",
        (subtask_id,),
    ).fetchone()
    if not row:
        from coopgest.http_helpers import api_error
        return None, api_error("Subtarefa não encontrada", 404, "NOT_FOUND")
    access_error = require_project_permission(conn, row["projeto_id"], minimum_role) if minimum_role else require_project_access(conn, row["projeto_id"])
    if access_error:
        return None, access_error
    return row, None


def resolve_project_scope(conn, raw_project_id, required=False):
    if raw_project_id is None or str(raw_project_id).strip() == "":
        if required:
            from coopgest.http_helpers import api_error
            return None, api_error("Projeto obrigatório", 400, "VALIDATION_ERROR")
        return None, None

    try:
        project_id = int(raw_project_id)
    except (TypeError, ValueError):
        from coopgest.http_helpers import api_error
        return None, api_error("Projeto inválido", 400, "VALIDATION_ERROR")

    exists = conn.execute("SELECT id FROM projetos WHERE id=?", (project_id,)).fetchone()
    if not exists:
        from coopgest.http_helpers import api_error
        return None, api_error("Projeto não encontrado", 404, "NOT_FOUND")

    if not can_access_project(conn, project_id):
        from coopgest.http_helpers import api_error
        return None, api_error("Sem acesso a este projeto", 403, "FORBIDDEN")

    return project_id, None


def ensure_project_skill_catalog(conn, projeto_id):
    from datetime import datetime
    count = conn.execute(
        "SELECT COUNT(*) FROM competencias WHERE projeto_id=?",
        (projeto_id,),
    ).fetchone()[0]
    if count > 0:
        return

    conn.executemany(
        """INSERT INTO competencias (nome, categoria, projeto_id, atualizado_em)
           VALUES (?, ?, ?, ?)""",
        [
            (name, category, projeto_id, datetime.now().isoformat(timespec="seconds"))
            for name, category in DEFAULT_PROJECT_SKILLS
        ],
    )
    conn.commit()
