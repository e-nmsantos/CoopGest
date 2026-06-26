from __future__ import annotations

from flask import Blueprint, jsonify, session

from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import login_required

bp = Blueprint("notifications", __name__)


@bp.route("/api/notifications")
@login_required
def api_notifications():
    username = session.get("username", "")
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM notificacoes WHERE destinatario=? OR destinatario='all' ORDER BY criado_em DESC LIMIT 50",
        (username,),
    ).fetchall()
    unread_count = conn.execute(
        "SELECT COUNT(*) FROM notificacoes WHERE (destinatario=? OR destinatario='all') AND lida=0",
        (username,),
    ).fetchone()[0]
    conn.close()
    return jsonify({"items": [row_to_dict(r) for r in rows], "unread_count": unread_count})


@bp.route("/api/notifications/read-all", methods=["PATCH"])
@login_required
def api_notifications_read_all():
    username = session.get("username", "")
    conn = get_db()
    conn.execute("UPDATE notificacoes SET lida=1 WHERE destinatario=? OR destinatario='all'", (username,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Notificações marcadas como lidas"})

