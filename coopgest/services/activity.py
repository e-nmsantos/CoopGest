from __future__ import annotations

from flask import current_app, session


def log_audit(conn, acao, entidade, entidade_id=None, detalhes="", projeto_id=None):
    user_nome = session.get("nome", session.get("username", "Sistema"))
    try:
        conn.execute(
            "INSERT INTO auditoria (user_nome, acao, entidade, entidade_id, projeto_id, detalhes) VALUES (?,?,?,?,?,?)",
            (user_nome, acao, entidade, entidade_id, projeto_id, str(detalhes)),
        )
    except Exception as exc:
        current_app.logger.warning("Falha no audit log: %s", exc)


def notify_in_app(conn, destinatario, assunto, mensagem, url=None):
    try:
        conn.execute(
            "INSERT INTO notificacoes (destinatario, assunto, mensagem, estado, lida, url) VALUES (?,?,?,?,?,?)",
            (destinatario, assunto, mensagem, "pendente", 0, url),
        )
    except Exception as exc:
        current_app.logger.warning("Falha ao gravar notificação para %s: %s", destinatario, exc)


def notify_in_app_once(conn, destinatario, assunto, mensagem, url=None):
    existing = conn.execute(
        """SELECT id FROM notificacoes
           WHERE destinatario = ?
             AND assunto = ?
             AND COALESCE(url, '') = COALESCE(?, '')
             AND lida = 0
           LIMIT 1""",
        (destinatario, assunto, url),
    ).fetchone()
    if existing:
        return False
    notify_in_app(conn, destinatario, assunto, mensagem, url)
    return True

