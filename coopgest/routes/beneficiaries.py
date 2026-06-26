from __future__ import annotations

from flask import Blueprint, jsonify, request

from coopgest.access import require_project_access, require_project_permission, require_row_project_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required

bp = Blueprint("beneficiaries", __name__)

_DIMENSOES = ("genero", "faixa_etaria", "localizacao", "vulnerabilidade", "outro")

_CATEGORIAS_PADRAO = {
    "genero": ("Masculino", "Feminino", "Outro / Não especificado"),
    "faixa_etaria": ("0-14 anos", "15-24 anos", "25-49 anos", "50-64 anos", "65+ anos"),
    "localizacao": ("Urbano", "Rural", "Periurbano"),
    "vulnerabilidade": ("Pessoas com deficiência", "Deslocados internos", "Refugiados", "Mulheres chefes de família", "Outros grupos vulneráveis"),
    "outro": (),
}


def _attach_desagregacao(conn, beneficiarios):
    if not beneficiarios:
        return beneficiarios
    ids = [b["id"] for b in beneficiarios]
    placeholders = ",".join("?" for _ in ids)
    rows = conn.execute(
        f"SELECT * FROM beneficiarios_desagregacao WHERE beneficiario_id IN ({placeholders}) ORDER BY dimensao, categoria",
        ids,
    ).fetchall()
    by_id: dict = {b["id"]: [] for b in beneficiarios}
    for r in rows:
        by_id[r["beneficiario_id"]].append(row_to_dict(r))
    for b in beneficiarios:
        b["desagregacao"] = by_id[b["id"]]
    return beneficiarios


@bp.route("/api/projects/<int:projeto_id>/beneficiarios", methods=["GET", "POST"])
@login_required
def api_project_beneficiarios(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error

    if request.method == "POST":
        permission_error = require_project_permission(conn, projeto_id, "membro")
        if permission_error:
            conn.close()
            return permission_error
        payload = request.get_json(silent=True)
        nome = str(payload.get("nome", "")).strip() if payload else ""
        if not nome:
            conn.close()
            return api_error("Nome é obrigatório", 400, "VALIDATION_ERROR")
        cursor = conn.execute(
            "INSERT INTO beneficiarios (projeto_id, nome, tipo, numero, descricao, localizacao) VALUES (?,?,?,?,?,?)",
            (
                projeto_id,
                nome,
                payload.get("tipo", "Individual"),
                int(payload.get("numero", 1) or 1),
                payload.get("descricao", "") or "",
                payload.get("localizacao", "") or "",
            ),
        )
        new_id = cursor.lastrowid
        conn.commit()
        row = conn.execute("SELECT * FROM beneficiarios WHERE id=?", (new_id,)).fetchone()
        result = row_to_dict(row)
        result["desagregacao"] = []
        conn.close()
        return jsonify(result), 201

    arquivado = request.args.get("arquivado", "0")
    rows = conn.execute(
        "SELECT * FROM beneficiarios WHERE projeto_id=? AND arquivado=? ORDER BY data_registo DESC",
        (projeto_id, 1 if arquivado == "1" else 0),
    ).fetchall()
    result = [row_to_dict(r) for r in rows]
    result = _attach_desagregacao(conn, result)
    conn.close()
    return jsonify(result)


@bp.route("/api/beneficiarios/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_beneficiario_detail(id):
    conn = get_db()
    row, access_error = require_row_project_access(conn, "beneficiarios", id, "Beneficiário não encontrado", "membro")
    if access_error:
        conn.close()
        return access_error

    if request.method == "DELETE":
        conn.execute("DELETE FROM beneficiarios WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Beneficiário eliminado"})

    payload = request.get_json(silent=True) or {}
    fields = []
    if "nome" in payload:
        nome = str(payload["nome"]).strip()
        if not nome:
            conn.close()
            return api_error("Nome não pode ser vazio", 400, "VALIDATION_ERROR")
        fields.append(("nome", nome))
    for field in ["tipo", "descricao", "localizacao"]:
        if field in payload:
            fields.append((field, str(payload[field] or "")))
    if "numero" in payload:
        fields.append(("numero", int(payload["numero"] or 1)))
    if "arquivado" in payload:
        fields.append(("arquivado", 1 if payload["arquivado"] else 0))
    if not fields:
        conn.close()
        return api_error("Nenhum campo para atualizar", 400, "VALIDATION_ERROR")

    set_clause = ", ".join([f"{f}=?" for f, _ in fields])
    values = [v for _, v in fields] + [id]
    conn.execute(f"UPDATE beneficiarios SET {set_clause} WHERE id=?", values)
    conn.commit()
    updated = conn.execute("SELECT * FROM beneficiarios WHERE id=?", (id,)).fetchone()
    result = row_to_dict(updated)
    result = _attach_desagregacao(conn, [result])[0]
    conn.close()
    return jsonify(result)


# ---------------------------------------------------------------------------
# Beneficiary disaggregation
# ---------------------------------------------------------------------------

@bp.route("/api/beneficiarios/<int:ben_id>/desagregacao", methods=["GET", "POST"])
@login_required
def api_beneficiario_desagregacao(ben_id):
    conn = get_db()
    row, access_error = require_row_project_access(conn, "beneficiarios", ben_id, "Beneficiário não encontrado", "membro")
    if access_error:
        conn.close()
        return access_error

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        dimensao = str(payload.get("dimensao") or "").strip()
        categoria = str(payload.get("categoria") or "").strip()
        if not dimensao or not categoria:
            conn.close()
            return api_error("Dimensão e categoria são obrigatórias", 400, "VALIDATION_ERROR")
        if dimensao not in _DIMENSOES:
            conn.close()
            return api_error(f"Dimensão inválida. Valores aceites: {', '.join(_DIMENSOES)}", 400, "VALIDATION_ERROR")
        numero = int(payload.get("numero") or 0)
        cursor = conn.execute(
            "INSERT INTO beneficiarios_desagregacao (beneficiario_id, projeto_id, dimensao, categoria, numero) VALUES (?,?,?,?,?)",
            (ben_id, row["projeto_id"], dimensao, categoria, numero),
        )
        conn.commit()
        new_row = conn.execute("SELECT * FROM beneficiarios_desagregacao WHERE id=?", (cursor.lastrowid,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(new_row)), 201

    rows = conn.execute(
        "SELECT * FROM beneficiarios_desagregacao WHERE beneficiario_id=? ORDER BY dimensao, categoria",
        (ben_id,),
    ).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@bp.route("/api/beneficiarios/desagregacao/<int:id>", methods=["PUT", "DELETE"])
@login_required
def api_desagregacao_detail(id):
    conn = get_db()
    des = conn.execute(
        """SELECT d.*, b.projeto_id
           FROM beneficiarios_desagregacao d
           JOIN beneficiarios b ON b.id = d.beneficiario_id
           WHERE d.id=?""",
        (id,),
    ).fetchone()
    if not des:
        conn.close()
        return api_error("Desagregação não encontrada", 404, "NOT_FOUND")
    permission_error = require_project_permission(conn, des["projeto_id"], "membro")
    if permission_error:
        conn.close()
        return permission_error

    if request.method == "DELETE":
        conn.execute("DELETE FROM beneficiarios_desagregacao WHERE id=?", (id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Desagregação eliminada"})

    payload = request.get_json(silent=True) or {}
    if "numero" in payload:
        conn.execute("UPDATE beneficiarios_desagregacao SET numero=? WHERE id=?", (int(payload["numero"] or 0), id))
        conn.commit()
    updated = conn.execute("SELECT * FROM beneficiarios_desagregacao WHERE id=?", (id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(updated))


@bp.route("/api/projects/<int:projeto_id>/beneficiarios/dimensoes")
@login_required
def api_beneficiarios_dimensoes(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error
    conn.close()
    return jsonify({
        "dimensoes": list(_DIMENSOES),
        "categorias_padrao": {k: list(v) for k, v in _CATEGORIAS_PADRAO.items()},
    })


@bp.route("/api/projects/<int:projeto_id>/beneficiarios/summary")
@login_required
def api_beneficiarios_summary(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error

    total_row = conn.execute(
        "SELECT COALESCE(SUM(numero), 0) AS total FROM beneficiarios WHERE projeto_id=? AND arquivado=0",
        (projeto_id,),
    ).fetchone()

    des_rows = conn.execute(
        """SELECT d.dimensao, d.categoria, SUM(d.numero) AS total
           FROM beneficiarios_desagregacao d
           JOIN beneficiarios b ON b.id = d.beneficiario_id
           WHERE b.projeto_id=? AND b.arquivado=0
           GROUP BY d.dimensao, d.categoria
           ORDER BY d.dimensao, d.categoria""",
        (projeto_id,),
    ).fetchall()

    by_dimensao: dict = {}
    for r in des_rows:
        by_dimensao.setdefault(r["dimensao"], []).append({"categoria": r["categoria"], "total": r["total"]})

    conn.close()
    return jsonify({
        "total_beneficiarios": total_row["total"],
        "desagregacao": by_dimensao,
    })
