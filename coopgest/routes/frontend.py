import os

from flask import Blueprint, current_app, send_from_directory

from coopgest.http_helpers import api_error


bp = Blueprint("frontend", __name__)


@bp.route("/", defaults={"path": ""})
@bp.route("/<path:path>")
def serve_frontend(path):
    """Serve os ficheiros estaticos do build React. Rota catch-all para SPA."""
    if path.startswith("api/"):
        return api_error("Endpoint não encontrado", 404, "NOT_FOUND")

    dist_folder = current_app.config["DIST_FOLDER"]
    if path and os.path.exists(os.path.join(dist_folder, path)):
        return send_from_directory(dist_folder, path)
    return send_from_directory(dist_folder, "index.html")

