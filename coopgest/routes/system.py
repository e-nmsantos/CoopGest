from datetime import datetime

from flask import Blueprint, jsonify

from coopgest.http_helpers import login_required


bp = Blueprint("system", __name__)


@bp.route("/api/health")
@login_required
def api_health():
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    })
