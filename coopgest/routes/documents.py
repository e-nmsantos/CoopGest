from __future__ import annotations

import os
import uuid

from flask import Blueprint, jsonify, request, send_from_directory, session
from werkzeug.utils import secure_filename

from coopgest.access import can_access_project, require_project_permission, resolve_project_scope
from coopgest.config import ALLOWED_UPLOAD_EXTENSIONS, UPLOAD_FOLDER
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("documents", __name__)


def _extension(filename):
    return filename.rsplit(".", 1)[-1].lower() if filename and "." in filename else ""


def _is_allowed_upload(filename):
    return _extension(filename) in ALLOWED_UPLOAD_EXTENSIONS


def _file_type(filename):
    ext = _extension(filename)
    if ext == "pdf":
        return "pdf"
    if ext in ("doc", "docx"):
        return "doc"
    if ext in ("jpg", "jpeg", "png", "gif", "webp"):
        return "image"
    if ext in ("xls", "xlsx", "csv"):
        return "spreadsheet"
    return "other"


@bp.route("/api/documents", methods=["GET", "POST"])
@login_required
def api_documents():
    conn = get_db()
    projeto_id, error_response = resolve_project_scope(
        conn,
        request.form.get("projeto_id") if request.method == "POST" else request.args.get("projeto_id"),
    )
    if error_response:
        conn.close()
        return error_response

    if request.method == "POST":
        if projeto_id is not None:
            permission_error = require_project_permission(conn, projeto_id, "membro")
            if permission_error:
                conn.close()
                return permission_error
        if "file" not in request.files:
            conn.close()
            return api_error("Ficheiro em falta", 400, "BAD_REQUEST")
        file = request.files["file"]
        if not file.filename:
            conn.close()
            return api_error("Nome de ficheiro inválido", 400, "BAD_REQUEST")
        if not _is_allowed_upload(file.filename):
            conn.close()
            return api_error("Tipo de ficheiro não permitido", 400, "VALIDATION_ERROR")

        original = secure_filename(file.filename)
        stored = f"{uuid.uuid4().hex}_{original}"
        path = os.path.join(UPLOAD_FOLDER, stored)
        file.save(path)
        categoria = request.form.get("category", "Outros")
        uploader = session.get("nome", session.get("username", "Sistema"))
        cursor = conn.execute(
            "INSERT INTO documentos (nome, nome_ficheiro, tipo, categoria, tamanho, uploader, projeto_id) VALUES (?,?,?,?,?,?,?)",
            (original, stored, _file_type(original), categoria, os.path.getsize(path), uploader, projeto_id),
        )
        new_id = cursor.lastrowid
        conn.commit()
        row = conn.execute("SELECT * FROM documentos WHERE id=?", (new_id,)).fetchone()
        conn.close()
        data = row_to_dict(row)
        data["url"] = f'/api/documents/{data["id"]}/download'
        return jsonify(data), 201

    if projeto_id is not None:
        rows = conn.execute(
            "SELECT * FROM documentos WHERE projeto_id=? ORDER BY criado_em DESC",
            (projeto_id,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM documentos ORDER BY criado_em DESC").fetchall()

    result = []
    for row in rows:
        data = row_to_dict(row)
        if data.get("projeto_id") and not can_access_project(conn, data["projeto_id"]):
            continue
        data["url"] = f'/api/documents/{data["id"]}/download'
        result.append(data)
    conn.close()
    return jsonify(result)


@bp.route("/api/documents/<int:id>/download")
@login_required
def api_document_download(id):
    conn = get_db()
    doc = conn.execute("SELECT * FROM documentos WHERE id=?", (id,)).fetchone()
    if not doc:
        conn.close()
        return api_error("Documento não encontrado", 404, "NOT_FOUND")
    if doc["projeto_id"]:
        permission_error = require_project_permission(conn, doc["projeto_id"], "membro")
        if permission_error:
            conn.close()
            return permission_error
    conn.close()
    return send_from_directory(UPLOAD_FOLDER, doc["nome_ficheiro"], as_attachment=True, download_name=doc["nome"])


@bp.route("/api/documents/<int:id>", methods=["DELETE"])
@login_required
def api_document_delete(id):
    conn = get_db()
    doc = conn.execute("SELECT * FROM documentos WHERE id=?", (id,)).fetchone()
    if not doc:
        conn.close()
        return api_error("Documento não encontrado", 404, "NOT_FOUND")
    if doc["projeto_id"] and not can_access_project(conn, doc["projeto_id"]):
        conn.close()
        return api_error("Sem acesso a este projeto", 403, "FORBIDDEN")

    filepath = os.path.join(UPLOAD_FOLDER, doc["nome_ficheiro"])
    if os.path.exists(filepath):
        os.remove(filepath)
    conn.execute("DELETE FROM documentos WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Documento eliminado"})

