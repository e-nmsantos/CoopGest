from __future__ import annotations

import os
from datetime import date, datetime

from flask import Blueprint, current_app, jsonify, request, send_from_directory, session

from coopgest.access import require_project_access, require_project_permission, resolve_project_scope
from coopgest.config import UPLOAD_FOLDER
from coopgest.db import get_db
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit
from coopgest.services.finance import (
    attach_finance_urls,
    build_finance_payload,
    finance_float,
    finance_payload,
    save_finance_attachment,
)

bp = Blueprint("finances", __name__)


@bp.route("/api/finances", methods=["GET"])
@login_required
def api_finances():
    conn = get_db()
    payload, error = build_finance_payload(conn, request.args.get("projeto_id"))
    conn.close()
    if error:
        return error
    return jsonify(payload)


@bp.route("/api/finances/transactions", methods=["POST"])
@login_required
def api_finance_transactions():
    payload = finance_payload()
    conn = get_db()
    project_id, error = resolve_project_scope(conn, payload.get("projeto_id"), required=True)
    if error:
        conn.close()
        return error
    access_error = require_project_permission(conn, project_id, "membro")
    if access_error:
        conn.close()
        return access_error

    tipo = payload.get("tipo") if payload.get("tipo") in {"Receita", "Despesa"} else "Despesa"
    valor = finance_float(payload.get("valor"))
    descricao = str(payload.get("descricao") or "").strip()
    if valor <= 0 or not descricao:
        conn.close()
        return api_error("Descricao e valor positivo sao obrigatorios", 400, "VALIDATION_ERROR")

    attachment, attachment_error = save_finance_attachment(request.files.get("anexo"))
    if attachment_error:
        conn.close()
        return attachment_error

    moeda = str(payload.get("moeda") or "EUR").strip().upper()
    if len(moeda) != 3:
        moeda = "EUR"
    taxa_cambio = float(payload.get("taxa_cambio") or 1.0)
    if taxa_cambio <= 0:
        taxa_cambio = 1.0

    cursor = conn.execute(
        """INSERT INTO movimentos_financeiros
           (projeto_id, tipo, categoria, descricao, entidade, referencia, valor, moeda, taxa_cambio,
            data_movimento, estado, notas, anexo_nome, anexo_ficheiro, anexo_tipo, anexo_tamanho, criado_por)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            project_id,
            tipo,
            str(payload.get("categoria") or "Sem categoria").strip(),
            descricao,
            str(payload.get("entidade") or "").strip(),
            str(payload.get("referencia") or "").strip(),
            valor,
            moeda,
            taxa_cambio,
            payload.get("data_movimento") or date.today().isoformat(),
            payload.get("estado") or "Confirmado",
            str(payload.get("notas") or "").strip(),
            attachment["anexo_nome"],
            attachment["anexo_ficheiro"],
            attachment["anexo_tipo"],
            attachment["anexo_tamanho"],
            session.get("nome", session.get("username", "")),
        ),
    )
    new_id = cursor.lastrowid
    log_audit(conn, "criado", "movimento_financeiro", new_id, descricao, project_id)
    conn.commit()
    row = conn.execute(
        """SELECT mf.*, p.nome AS projeto_nome
           FROM movimentos_financeiros mf
           JOIN projetos p ON p.id = mf.projeto_id
           WHERE mf.id=?""",
        (new_id,),
    ).fetchone()
    conn.close()
    return jsonify(attach_finance_urls([row])[0]), 201


@bp.route("/api/finances/transactions/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_finance_transaction_detail(id):
    conn = get_db()
    row = conn.execute("SELECT * FROM movimentos_financeiros WHERE id=?", (id,)).fetchone()
    if not row:
        conn.close()
        return api_error("Movimento financeiro nao encontrado", 404, "NOT_FOUND")

    access_error = require_project_permission(conn, row["projeto_id"], "membro")
    if access_error:
        conn.close()
        return access_error

    if request.method == "DELETE":
        if row["anexo_ficheiro"]:
            filepath = os.path.join(UPLOAD_FOLDER, row["anexo_ficheiro"])
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except OSError:
                    current_app.logger.warning("Falha ao remover anexo financeiro %s", filepath)
        log_audit(conn, "eliminado", "movimento_financeiro", id, row["descricao"], row["projeto_id"])
        conn.execute("DELETE FROM movimentos_financeiros WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Movimento eliminado com sucesso"})

    payload = finance_payload()
    moeda_update = None
    if "moeda" in payload:
        m = str(payload["moeda"] or "EUR").strip().upper()
        moeda_update = m if len(m) == 3 else "EUR"
    taxa_update = None
    if "taxa_cambio" in payload:
        t = float(payload["taxa_cambio"] or 1.0)
        taxa_update = t if t > 0 else 1.0

    fields = [
        ("tipo", payload.get("tipo") if payload.get("tipo") in {"Receita", "Despesa"} else None),
        ("categoria", payload.get("categoria")),
        ("descricao", payload.get("descricao")),
        ("entidade", payload.get("entidade")),
        ("referencia", payload.get("referencia")),
        ("valor", finance_float(payload.get("valor")) if "valor" in payload else None),
        ("moeda", moeda_update),
        ("taxa_cambio", taxa_update),
        ("data_movimento", payload.get("data_movimento")),
        ("estado", payload.get("estado")),
        ("notas", payload.get("notas")),
        ("atualizado_em", datetime.now().isoformat(timespec="seconds")),
    ]
    updates = [(field, value) for field, value in fields if value is not None]
    new_attachment = request.files.get("anexo")
    if new_attachment and new_attachment.filename:
        attachment, attachment_error = save_finance_attachment(new_attachment)
        if attachment_error:
            conn.close()
            return attachment_error
        if row["anexo_ficheiro"]:
            old_path = os.path.join(UPLOAD_FOLDER, row["anexo_ficheiro"])
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except OSError:
                    current_app.logger.warning("Falha ao remover anexo financeiro antigo %s", old_path)
        updates.extend(attachment.items())
    if not updates:
        conn.close()
        return api_error("Nenhum campo para atualizar", 400, "VALIDATION_ERROR")

    set_clause = ", ".join([f"{field}=?" for field, _ in updates])
    values = [value for _, value in updates] + [id]
    conn.execute(f"UPDATE movimentos_financeiros SET {set_clause} WHERE id=?", values)
    log_audit(conn, "atualizado", "movimento_financeiro", id, str({field: value for field, value in updates}), row["projeto_id"])
    conn.commit()
    updated = conn.execute(
        """SELECT mf.*, p.nome AS projeto_nome
           FROM movimentos_financeiros mf
           JOIN projetos p ON p.id = mf.projeto_id
           WHERE mf.id=?""",
        (id,),
    ).fetchone()
    conn.close()
    return jsonify(attach_finance_urls([updated])[0])


@bp.route("/api/finances/transactions/<int:id>/attachment")
@login_required
def api_finance_transaction_attachment(id):
    conn = get_db()
    row = conn.execute("SELECT * FROM movimentos_financeiros WHERE id=?", (id,)).fetchone()
    if not row:
        conn.close()
        return api_error("Movimento financeiro nao encontrado", 404, "NOT_FOUND")
    access_error = require_project_access(conn, row["projeto_id"])
    conn.close()
    if access_error:
        return access_error
    if not row["anexo_ficheiro"]:
        return api_error("Anexo nao encontrado", 404, "NOT_FOUND")
    return send_from_directory(
        UPLOAD_FOLDER,
        row["anexo_ficheiro"],
        as_attachment=True,
        download_name=row["anexo_nome"] or row["anexo_ficheiro"],
    )
