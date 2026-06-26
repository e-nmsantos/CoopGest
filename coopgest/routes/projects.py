from flask import Blueprint, jsonify, request, session

from coopgest.access import can_access_project, filter_accessible_projects, require_project_permission
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.finance import apply_finance_execution_to_budget
from coopgest.validators import validate_project_payload


bp = Blueprint("projects", __name__)

@bp.route('/api/projects', methods=['GET', 'POST'])
@login_required
def api_projects():
    if request.method == 'POST':
        payload = request.get_json(silent=True)
        project_data, errors = validate_project_payload(payload)

        if errors:
            return api_error('Payload inválido', 400, 'VALIDATION_ERROR', errors)

        conn = get_db()
        cursor = conn.execute(
            '''INSERT INTO projetos (nome, descricao, objetivos, data_inicio, data_fim, estado)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (
                project_data['nome'],
                project_data['descricao'] or '',
                project_data['objetivos'] or '',
                project_data['data_inicio'],
                project_data['data_fim'],
                project_data['estado'] or 'Planeamento',
            )
        )
        new_id = cursor.lastrowid
        conn.execute(
            'INSERT OR IGNORE INTO projeto_membros (projeto_id, user_id, papel) VALUES (?,?,?)',
            (new_id, session['user_id'], 'gestor')
        )
        conn.commit()
        novo_projeto = conn.execute('SELECT * FROM projetos WHERE id=?', (new_id,)).fetchone()
        conn.close()

        return jsonify(row_to_dict(novo_projeto)), 201

    conn = get_db()
    include_archived = request.args.get('include_archived') == '1'
    archive_filter = '' if include_archived else 'WHERE p.arquivado = 0'

    # Paginação opcional: ?page=1&per_page=20 (sem parâmetros = todos)
    page = request.args.get('page', type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 200)

    base_query = f'''SELECT p.*,
                      COALESCE((SELECT COUNT(*) FROM projeto_parceiro pp WHERE pp.projeto_id = p.id), 0) AS membros,
                      COALESCE((SELECT COUNT(*) FROM tarefas t WHERE t.projeto_id = p.id), 0) AS tarefas_total,
                      COALESCE((SELECT COUNT(*) FROM tarefas t WHERE t.projeto_id = p.id AND t.estado = 'Concluída'), 0) AS tarefas_concluidas,
                      COALESCE((SELECT COUNT(*) FROM tarefas t WHERE t.projeto_id = p.id AND t.estado != 'Concluída' AND t.data_fim IS NOT NULL AND t.data_fim < date('now')), 0) AS tarefas_atrasadas,
                      COALESCE((SELECT COUNT(*) FROM milestones m WHERE m.projeto_id = p.id AND m.estado != 'Concluído' AND m.data_prevista IS NOT NULL AND m.data_prevista BETWEEN date('now') AND date('now', '+14 day')), 0) AS milestones_proximos
               FROM projetos p
               {archive_filter}
               ORDER BY p.criado_em DESC'''

    if page is not None:
        offset = (page - 1) * per_page
        all_rows = filter_accessible_projects(conn, conn.execute(base_query).fetchall())
        total = len(all_rows)
        projetos = [row_to_dict(r) for r in all_rows[offset:offset + per_page]]
        conn.close()
        return jsonify({'items': projetos, 'total': total, 'page': page, 'per_page': per_page, 'pages': -(-total // per_page)})

    projetos = [row_to_dict(row) for row in filter_accessible_projects(conn, conn.execute(base_query).fetchall())]
    conn.close()
    return jsonify(projetos)


@bp.route('/api/projects/<int:id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def api_project_detail(id):
    if request.method == 'PUT':
        payload = request.get_json(silent=True)
        project_data, errors = validate_project_payload(payload, partial=True)

        if errors:
            return api_error('Payload inválido', 400, 'VALIDATION_ERROR', errors)

        # privado pode vir fora do project_data (não passa pela validação)
        privado_val = payload.get('privado') if isinstance(payload, dict) else None

        updatable_fields = [
            ('nome', project_data.get('nome')),
            ('descricao', project_data.get('descricao')),
            ('objetivos', project_data.get('objetivos')),
            ('data_inicio', project_data.get('data_inicio')),
            ('data_fim', project_data.get('data_fim')),
            ('estado', project_data.get('estado')),
        ]
        if privado_val is not None:
            updatable_fields.append(('privado', int(bool(privado_val))))

        updates = [(field, value) for field, value in updatable_fields if value is not None]
        if not updates:
            return api_error('Nenhum campo para atualizar', 400, 'VALIDATION_ERROR')

        conn = get_db()
        access_error = require_project_permission(conn, id, 'gestor')
        if access_error:
            conn.close()
            return access_error

        set_clause = ', '.join([f'{field}=?' for field, _ in updates])
        values = [value for _, value in updates]
        values.append(id)

        conn.execute(f'UPDATE projetos SET {set_clause} WHERE id=?', values)
        conn.commit()
        updated = conn.execute('SELECT * FROM projetos WHERE id=?', (id,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(updated))

    if request.method == 'DELETE':
        conn = get_db()
        access_error = require_project_permission(conn, id, 'gestor')
        if access_error:
            conn.close()
            return access_error

        conn.execute('DELETE FROM projetos WHERE id=?', (id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Projeto eliminado com sucesso'})

    conn = get_db()
    projeto = conn.execute('SELECT * FROM projetos WHERE id=?', (id,)).fetchone()

    if not projeto:
        conn.close()
        return api_error('Projeto não encontrado', 404, 'NOT_FOUND')

    if not can_access_project(conn, id):
        conn.close()
        return api_error('Acesso negado a este projecto privado', 403, 'FORBIDDEN')

    parceiros = [
        row_to_dict(row) for row in conn.execute(
            '''SELECT p.*, pp.papel FROM parceiros p
               JOIN projeto_parceiro pp ON p.id = pp.parceiro_id
               WHERE pp.projeto_id = ?''',
            (id,)
        ).fetchall()
    ]

    tarefas = [
        row_to_dict(row) for row in conn.execute(
            'SELECT * FROM tarefas WHERE projeto_id=? ORDER BY data_fim ASC', (id,)
        ).fetchall()
    ]

    milestones = [
        row_to_dict(row) for row in conn.execute(
            'SELECT * FROM milestones WHERE projeto_id=? ORDER BY data_prevista ASC', (id,)
        ).fetchall()
    ]

    orcamento = [
        row_to_dict(row) for row in conn.execute(
            'SELECT * FROM orcamento WHERE projeto_id=? ORDER BY tipo, categoria', (id,)
        ).fetchall()
    ]
    orcamento = apply_finance_execution_to_budget(conn, id, orcamento)

    funding = [
        row_to_dict(row) for row in conn.execute(
            'SELECT * FROM fontes_financiamento WHERE projeto_id=? ORDER BY criado_em ASC', (id,)
        ).fetchall()
    ]

    comentarios = [
        row_to_dict(row) for row in conn.execute(
            'SELECT * FROM comentarios WHERE projeto_id=? ORDER BY criado_em DESC', (id,)
        ).fetchall()
    ]

    riscos = [
        row_to_dict(row) for row in conn.execute(
            'SELECT * FROM riscos WHERE projeto_id=? ORDER BY criado_em ASC', (id,)
        ).fetchall()
    ]

    beneficiarios = [
        row_to_dict(row) for row in conn.execute(
            'SELECT * FROM beneficiarios WHERE projeto_id=? ORDER BY data_registo DESC', (id,)
        ).fetchall()
    ]

    receitas = sum(r['valor_previsto'] for r in orcamento if r['tipo'] == 'Receita')
    despesas = sum(r['valor_previsto'] for r in orcamento if r['tipo'] == 'Despesa')
    receitas_real = sum(r['valor_real'] for r in orcamento if r['tipo'] == 'Receita')
    despesas_real = sum(r['valor_real'] for r in orcamento if r['tipo'] == 'Despesa')
    total_beneficiarios = sum(b.get('numero', 1) for b in beneficiarios)
    conn.close()

    return jsonify({
        'projeto': row_to_dict(projeto),
        'parceiros': parceiros,
        'tarefas': tarefas,
        'milestones': milestones,
        'orcamento': orcamento,
        'funding': funding,
        'comentarios': comentarios,
        'riscos': riscos,
        'beneficiarios': beneficiarios,
        'total_beneficiarios': total_beneficiarios,
        'resumo_orcamento': {
            'receitas': receitas,
            'despesas': despesas,
            'receitas_real': receitas_real,
            'despesas_real': despesas_real,
        }
    })


