from datetime import datetime

from flask import Blueprint, jsonify

bp = Blueprint("system", __name__)


@bp.route("/api/health")
def api_health():
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    })
