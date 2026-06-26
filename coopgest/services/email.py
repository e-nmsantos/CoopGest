from __future__ import annotations

from typing import Any

from coopgest.db import get_db

_app = None
_mail = None
_message_cls: Any = None
_mail_available = False


def configure_email_service(app, mail, message_cls, mail_available: bool) -> None:
    global _app, _mail, _message_cls, _mail_available
    _app = app
    _mail = mail
    _message_cls = message_cls
    _mail_available = mail_available


def send_email(to_list, subject, body):
    """Send an email when SMTP is configured, and always record the notification."""
    recipients = to_list if isinstance(to_list, list) else [to_list]
    conn = get_db()
    for recipient in recipients:
        estado = "sem_smtp"
        if _mail_available and _mail and _app and _message_cls and _app.config.get("MAIL_SERVER"):
            try:
                with _app.app_context():
                    msg = _message_cls(subject, recipients=[recipient], body=body)
                    _mail.send(msg)
                estado = "enviado"
            except Exception as exc:
                estado = f"erro: {exc}"
        else:
            print(f"[EMAIL] Para: {recipient} | Assunto: {subject}")
        conn.execute(
            "INSERT INTO notificacoes (destinatario, assunto, mensagem, estado) VALUES (?,?,?,?)",
            (recipient, subject, body, estado),
        )
    conn.commit()
    conn.close()
