from flask import Blueprint, jsonify, request

from coopgest.access import require_project_permission, require_row_project_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit


bp = Blueprint("budget", __name__)

@bp.route('/api/projects/<int:projeto_id>/budget', methods=['POST'])
@login_required
def api_project_budget(projeto_id):
    conn = get_db()
    access_error = require_project_permission(conn, projeto_id, 'membro')
    if access_error:
        conn.close()
        return access_error

    payload = request.get_json(silent=True)
    if not payload:
        conn.close()
        return api_error('Payload inválido', 400, 'BAD_REQUEST')

    cursor = conn.execute(
        'INSERT INTO orcamento (projeto_id, tipo, categoria, descricao, valor_previsto, valor_real) VALUES (?,?,?,?,?,?)',
        (
            projeto_id,
            payload.get('tipo', 'Despesa'),
            payload.get('categoria', '') or '',
            payload.get('descricao', '') or '',
            float(payload.get('valor_previsto', 0) or 0),
            float(payload.get('valor_real', 0) or 0),
        )
    )
    new_id = cursor.lastrowid
    log_audit(conn, 'criado', 'orcamento', new_id, payload.get('categoria', '') or payload.get('tipo', 'Despesa'), projeto_id)
    conn.commit()
    row = conn.execute('SELECT * FROM orcamento WHERE id=?', (new_id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)), 201


@bp.route('/api/budget/<int:id>', methods=['DELETE'])
@login_required
def api_budget_detail(id):
    conn = get_db()
    existing, access_error = require_row_project_access(conn, 'orcamento', id, 'Item de orçamento não encontrado', 'membro')
    if access_error:
        conn.close()
        return access_error
    log_audit(conn, 'eliminado', 'orcamento', id, existing['categoria'], existing['projeto_id'])
    conn.execute('DELETE FROM orcamento WHERE id=?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Item eliminado com sucesso'})



