from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request, session

from coopgest.access import can_access_project, require_project_permission, require_task_access
from coopgest.config import KANBAN_ESTADO_MAP, KANBAN_ESTADO_REVERSE, KANBAN_PRIORITY_MAP, KANBAN_PRIORITY_REVERSE
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.activity import log_audit, notify_in_app
from coopgest.services.realtime import broadcast_project_data


bp = Blueprint("tasks", __name__)

def _task_to_kanban(row, conn=None):
    d = row_to_dict(row)
    if not d:
        return None
    responsavel = d.get('responsavel', '') or ''
    collaborators = []
    if responsavel:
        initials = ''.join(w[0].upper() for w in responsavel.split()[:2])
        collaborators = [{'id': 'r', 'name': responsavel, 'initials': initials, 'color': '#3b82f6'}]
    raw_tags = d.get('tags', '') or ''
    tags = [t.strip() for t in raw_tags.split(',') if t.strip()]

    # Subtasks and comments counts (if conn provided)
    subtasks_info = {'total': 0, 'completed': 0}
    comments_count = 0
    dependencies = []
    if conn:
        task_id = d['id']
        sub_rows = conn.execute('SELECT concluida FROM subtarefas WHERE tarefa_id=?', (task_id,)).fetchall()
        subtasks_info = {'total': len(sub_rows), 'completed': sum(1 for r in sub_rows if r['concluida'])}
        comments_count = conn.execute('SELECT COUNT(*) FROM comentarios WHERE tarefa_id=?', (task_id,)).fetchone()[0]
        dep_rows = conn.execute('SELECT depende_de FROM tarefa_dependencias WHERE tarefa_id=?', (task_id,)).fetchall()
        dependencies = [str(r['depende_de']) for r in dep_rows]

    return {
        'id': str(d['id']),
        'title': d.get('nome', ''),
        'nome': d.get('nome', ''),
        'description': d.get('descricao', '') or '',
        'priority': KANBAN_PRIORITY_REVERSE.get(d.get('prioridade', 'Normal'), 'medium'),
        'tags': tags,
        'collaborators': collaborators,
        'dueDate': d.get('data_fim') or None,
        'data_inicio': d.get('data_inicio') or None,
        'data_fim': d.get('data_fim') or None,
        'status': KANBAN_ESTADO_REVERSE.get(d.get('estado', 'Por fazer'), 'todo'),
        'projeto_id': d.get('projeto_id'),
        'subtasks': subtasks_info,
        'comments': comments_count,
        'dependencies': dependencies,
        'progress': round((subtasks_info['completed'] / subtasks_info['total']) * 100) if subtasks_info['total'] > 0 else None,
    }


@bp.route('/api/projects/<int:projeto_id>/tasks', methods=['GET', 'POST'])
@login_required
def api_project_tasks(projeto_id):
    conn = get_db()
    projeto = conn.execute('SELECT id FROM projetos WHERE id=?', (projeto_id,)).fetchone()
    if not projeto:
        conn.close()
        return api_error('Projeto não encontrado', 404, 'NOT_FOUND')

    if not can_access_project(conn, projeto_id):
        conn.close()
        return api_error('Acesso negado a este projecto privado', 403, 'FORBIDDEN')

    if request.method == 'POST':
        payload = request.get_json(silent=True)
        if not payload or not str(payload.get('title', '')).strip():
            conn.close()
            return api_error('Título é obrigatório', 400, 'VALIDATION_ERROR')

        prioridade = KANBAN_PRIORITY_MAP.get(payload.get('priority', 'medium'), 'Normal')
        estado = KANBAN_ESTADO_MAP.get(payload.get('status', 'todo'), 'Por fazer')
        tags_raw = payload.get('tags', [])
        tags_str = ','.join(tags_raw) if isinstance(tags_raw, list) else str(tags_raw)
        recorrencia = payload.get('recorrencia') or None
        responsavel = payload.get('responsavel', '') or ''
        cursor = conn.execute(
            'INSERT INTO tarefas (projeto_id, nome, descricao, responsavel, data_inicio, data_fim, prioridade, estado, tags, recorrencia) VALUES (?,?,?,?,?,?,?,?,?,?)',
            (
                projeto_id,
                payload['title'].strip(),
                payload.get('description', '') or '',
                responsavel,
                payload.get('data_inicio') or payload.get('startDate') or '',
                payload.get('dueDate', '') or '',
                prioridade,
                estado,
                tags_str,
                recorrencia,
            )
        )
        new_id = cursor.lastrowid
        log_audit(conn, 'criada', 'tarefa', new_id, payload.get('title', ''), projeto_id)
        # Notificar responsável se atribuído
        if responsavel:
            user_row = conn.execute('SELECT username FROM utilizadores WHERE nome=?', (responsavel,)).fetchone()
            actor = session.get('nome', session.get('username', 'Alguém'))
            if user_row and user_row['username'] != session.get('username'):
                notify_in_app(conn, user_row['username'],
                    f'Nova tarefa atribuída: {payload["title"].strip()}',
                    f'{actor} criou e atribuiu-te a tarefa "{payload["title"].strip()}".',
                    f'/projeto/{projeto_id}')
        conn.commit()
        row = conn.execute('SELECT * FROM tarefas WHERE id=?', (new_id,)).fetchone()
        result = _task_to_kanban(row, conn)
        broadcast_project_data(projeto_id, 'task_created', result)
        conn.close()
        return jsonify(result), 201

    rows = conn.execute(
        'SELECT * FROM tarefas WHERE projeto_id=? ORDER BY data_fim ASC', (projeto_id,)
    ).fetchall()
    result = [_task_to_kanban(r, conn) for r in rows]
    conn.close()
    return jsonify(result)


@bp.route('/api/tasks/<int:id>', methods=['GET', 'PATCH', 'DELETE'])
@login_required
def api_task_detail(id):
    conn = get_db()
    existing, access_error = require_task_access(conn, id)
    if access_error:
        conn.close()
        return access_error

    if request.method == 'GET':
        result = _task_to_kanban(existing, conn)
        conn.close()
        return jsonify(result)

    permission_error = require_project_permission(conn, existing['projeto_id'], 'membro')
    if permission_error:
        conn.close()
        return permission_error

    if request.method == 'DELETE':
        projeto_id_del = existing['projeto_id']
        log_audit(conn, 'eliminada', 'tarefa', id, existing['nome'], projeto_id_del)
        conn.execute('DELETE FROM tarefas WHERE id=?', (id,))
        conn.commit()
        broadcast_project_data(projeto_id_del, 'task_deleted', {'id': id})
        conn.close()
        return jsonify({'message': 'Tarefa eliminada com sucesso'})

    payload = request.get_json(silent=True)
    if not payload:
        conn.close()
        return api_error('Payload inválido', 400, 'BAD_REQUEST')

    updates = []
    new_estado = None
    new_responsavel = None
    if 'status' in payload:
        new_estado = KANBAN_ESTADO_MAP.get(payload['status'])
        if not new_estado:
            conn.close()
            return api_error('Estado inválido', 400, 'VALIDATION_ERROR')
        updates.append(('estado', new_estado))
    if 'title' in payload:
        updates.append(('nome', str(payload['title']).strip()))
    if 'priority' in payload:
        prioridade = KANBAN_PRIORITY_MAP.get(payload['priority'])
        if prioridade:
            updates.append(('prioridade', prioridade))
    if 'responsavel' in payload:
        new_responsavel = str(payload['responsavel'] or '')
        updates.append(('responsavel', new_responsavel))
    if 'tags' in payload:
        tags_raw = payload['tags']
        tags_str = ','.join(tags_raw) if isinstance(tags_raw, list) else str(tags_raw or '')
        updates.append(('tags', tags_str))
    if 'recorrencia' in payload:
        updates.append(('recorrencia', payload['recorrencia'] or None))
    if 'dueDate' in payload:
        updates.append(('data_fim', payload['dueDate'] or None))
    if 'data_inicio' in payload:
        updates.append(('data_inicio', payload['data_inicio'] or None))
    if 'startDate' in payload:
        updates.append(('data_inicio', payload['startDate'] or None))
    if 'description' in payload:
        updates.append(('descricao', str(payload['description'] or '')))

    if not updates:
        conn.close()
        return api_error('Nenhum campo para atualizar', 400, 'VALIDATION_ERROR')

    set_clause = ', '.join([f'{f}=?' for f, _ in updates])
    values = [v for _, v in updates] + [id]
    conn.execute(f'UPDATE tarefas SET {set_clause} WHERE id=?', values)
    log_audit(conn, 'atualizada', 'tarefa', id, str({f: v for f, v in updates}), existing['projeto_id'])

    row = conn.execute('SELECT * FROM tarefas WHERE id=?', (id,)).fetchone()

    # Notificar quando responsável é atribuído
    if new_responsavel:
        user_row = conn.execute('SELECT username FROM utilizadores WHERE nome=?', (new_responsavel,)).fetchone()
        actor = session.get('nome', session.get('username', 'Alguém'))
        if user_row and user_row['username'] != session.get('username'):
            notify_in_app(conn, user_row['username'],
                f'Tarefa atribuída: {row["nome"]}',
                f'{actor} atribuiu-te a tarefa "{row["nome"]}".',
                f'/projeto/{row["projeto_id"]}')

    # Criar próxima instância se tarefa concluída e tem recorrência
    if new_estado == 'Concluída' and row and row['recorrencia']:
        rec = row['recorrencia']
        base_date = row['data_fim'] or datetime.now().strftime('%Y-%m-%d')
        try:
            d = datetime.strptime(base_date, '%Y-%m-%d')
            if rec == 'diária':
                next_d = d + timedelta(days=1)
            elif rec == 'semanal':
                next_d = d + timedelta(weeks=1)
            elif rec == 'mensal':
                next_d = d.replace(month=d.month % 12 + 1, year=d.year + (1 if d.month == 12 else 0))
            elif rec == 'trimestral':
                month = d.month + 3
                year = d.year + (month - 1) // 12
                next_d = d.replace(month=((month - 1) % 12) + 1, year=year)
            else:
                next_d = None
            if next_d:
                conn.execute(
                    'INSERT INTO tarefas (projeto_id, nome, descricao, responsavel, data_fim, prioridade, estado, tags, recorrencia) VALUES (?,?,?,?,?,?,?,?,?)',
                    (row['projeto_id'], row['nome'], row['descricao'] or '', row['responsavel'] or '',
                     next_d.strftime('%Y-%m-%d'), row['prioridade'] or 'Normal', 'Por fazer',
                     row['tags'] or '', rec)
                )
        except Exception as e:
            current_app.logger.warning('Falha ao criar tarefa recorrente: %s', e)

    conn.commit()
    result = _task_to_kanban(row, conn)
    broadcast_project_data(row['projeto_id'], 'task_updated', result)
    conn.close()
    return jsonify(result)



