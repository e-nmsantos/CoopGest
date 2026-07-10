from datetime import datetime

from flask import Blueprint, jsonify, request

from coopgest.access import require_project_access, require_project_permission, require_row_project_access
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit


bp = Blueprint("milestones", __name__)

@bp.route('/api/projects/<int:projeto_id>/milestones', methods=['GET', 'POST'])
@login_required
def api_project_milestones(projeto_id):
    conn = get_db()
    access_error = require_project_access(conn, projeto_id)
    if access_error:
        conn.close()
        return access_error

    if request.method == 'POST':
        permission_error = require_project_permission(conn, projeto_id, 'membro')
        if permission_error:
            conn.close()
            return permission_error
        payload = request.get_json(silent=True)
        if not payload or not str(payload.get('nome', '')).strip():
            conn.close()
            return api_error('Nome é obrigatório', 400, 'VALIDATION_ERROR')
        cursor = conn.execute(
            'INSERT INTO milestones (projeto_id, nome, descricao, data_prevista, estado) VALUES (?,?,?,?,?)',
            (
                projeto_id,
                payload['nome'].strip(),
                payload.get('descricao', '') or '',
                payload.get('data_prevista', '') or '',
                'Pendente',
            )
        )
        new_id = cursor.lastrowid
        log_audit(conn, 'criado', 'milestone', new_id, payload['nome'].strip(), projeto_id)
        conn.commit()
        row = conn.execute('SELECT * FROM milestones WHERE id=?', (new_id,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201

    rows = conn.execute(
        'SELECT * FROM milestones WHERE projeto_id=? ORDER BY data_prevista ASC', (projeto_id,)
    ).fetchall()
    conn.close()
    result = []
    for row in rows:
        data = row_to_dict(row)
        data["titulo"] = data.get("nome", "")
        result.append(data)
    return jsonify(result)


@bp.route('/api/milestones/<int:id>', methods=['PATCH', 'DELETE'])
@login_required
def api_milestone_detail(id):
    conn = get_db()
    existing, access_error = require_row_project_access(conn, 'milestones', id, 'Milestone não encontrado', 'membro')
    if access_error:
        conn.close()
        return access_error

    if request.method == 'DELETE':
        log_audit(conn, 'eliminado', 'milestone', id, existing['nome'], existing['projeto_id'])
        conn.execute('DELETE FROM milestones WHERE id=?', (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Milestone eliminado com sucesso'})

    payload = request.get_json(silent=True)
    if not payload:
        conn.close()
        return api_error('Payload inválido', 400, 'BAD_REQUEST')

    updates = []
    if 'estado' in payload:
        updates.append(('estado', payload['estado']))
        if payload['estado'] == 'Concluído':
            updates.append(('data_concluida', datetime.now().strftime('%Y-%m-%d')))
        elif payload['estado'] == 'Pendente':
            updates.append(('data_concluida', None))
    if 'nome' in payload:
        updates.append(('nome', str(payload['nome']).strip()))

    if not updates:
        conn.close()
        return api_error('Nenhum campo para atualizar', 400, 'VALIDATION_ERROR')

    set_clause = ', '.join([f'{f}=?' for f, _ in updates])
    values = [v for _, v in updates] + [id]
    conn.execute(f'UPDATE milestones SET {set_clause} WHERE id=?', values)
    log_audit(conn, 'atualizado', 'milestone', id, str({f: v for f, v in updates}), existing['projeto_id'])
    conn.commit()
    row = conn.execute('SELECT * FROM milestones WHERE id=?', (id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))


# --- Orçamento API ------------------------------------------------------------


