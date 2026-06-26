from datetime import datetime

from flask import flash, redirect, render_template, request, url_for

from coopgest.db import get_db


def register_legacy_routes(app):
    @app.route('/legacy')
    def index():
        conn = get_db()
        stats = {
            'projetos': conn.execute('SELECT COUNT(*) FROM projetos').fetchone()[0],
            'parceiros': conn.execute('SELECT COUNT(*) FROM parceiros').fetchone()[0],
            'tarefas': conn.execute("SELECT COUNT(*) FROM tarefas WHERE estado != 'Concluída'").fetchone()[0],
            'milestones': conn.execute("SELECT COUNT(*) FROM milestones WHERE estado != 'Concluído'").fetchone()[0],
        }
        projetos_recentes = conn.execute(
            'SELECT * FROM projetos ORDER BY criado_em DESC LIMIT 5'
        ).fetchall()
        tarefas_pendentes = conn.execute(
            '''SELECT t.*, p.nome as projeto_nome FROM tarefas t
               JOIN projetos p ON t.projeto_id = p.id
               WHERE t.estado != "Concluída" ORDER BY t.data_fim ASC LIMIT 5'''
        ).fetchall()
        conn.close()
        return render_template('index.html', stats=stats,
                               projetos_recentes=projetos_recentes,
                               tarefas_pendentes=tarefas_pendentes)


    # --- Projetos -----------------------------------------------------------------

    @app.route('/legacy/projetos')
    def projetos_list():
        conn = get_db()
        projetos = conn.execute('SELECT * FROM projetos ORDER BY criado_em DESC').fetchall()
        conn.close()
        return render_template('projetos/list.html', projetos=projetos)


    @app.route('/legacy/projetos/novo', methods=['GET', 'POST'])
    def projeto_create():
        if request.method == 'POST':
            conn = get_db()
            conn.execute(
                'INSERT INTO projetos (nome, descricao, objetivos, data_inicio, data_fim, estado) VALUES (?,?,?,?,?,?)',
                (request.form['nome'], request.form['descricao'], request.form['objetivos'],
                 request.form['data_inicio'], request.form['data_fim'], request.form['estado'])
            )
            conn.commit()
            conn.close()
            flash('Projeto criado com sucesso!', 'success')
            return redirect(url_for('projetos_list'))
        return render_template('projetos/form.html', projeto=None)


    @app.route('/legacy/projetos/<int:id>')
    def projeto_detail(id):
        conn = get_db()
        projeto = conn.execute('SELECT * FROM projetos WHERE id=?', (id,)).fetchone()
        if not projeto:
            conn.close()
            flash('Projeto não encontrado.', 'danger')
            return redirect(url_for('projetos_list'))

        parceiros = conn.execute(
            '''SELECT p.*, pp.papel FROM parceiros p
               JOIN projeto_parceiro pp ON p.id = pp.parceiro_id
               WHERE pp.projeto_id = ?''', (id,)
        ).fetchall()
        tarefas = conn.execute(
            'SELECT * FROM tarefas WHERE projeto_id=? ORDER BY data_fim ASC', (id,)
        ).fetchall()
        milestones = conn.execute(
            'SELECT * FROM milestones WHERE projeto_id=? ORDER BY data_prevista ASC', (id,)
        ).fetchall()
        orcamento = conn.execute(
            'SELECT * FROM orcamento WHERE projeto_id=? ORDER BY tipo, categoria', (id,)
        ).fetchall()

        receitas = sum(r['valor_previsto'] for r in orcamento if r['tipo'] == 'Receita')
        despesas = sum(r['valor_previsto'] for r in orcamento if r['tipo'] == 'Despesa')
        receitas_real = sum(r['valor_real'] for r in orcamento if r['tipo'] == 'Receita')
        despesas_real = sum(r['valor_real'] for r in orcamento if r['tipo'] == 'Despesa')

        todos_parceiros = conn.execute('SELECT * FROM parceiros ORDER BY nome').fetchall()
        conn.close()
        return render_template('projetos/detail.html',
                               projeto=projeto, parceiros=parceiros,
                               tarefas=tarefas, milestones=milestones,
                               orcamento=orcamento, todos_parceiros=todos_parceiros,
                               receitas=receitas, despesas=despesas,
                               receitas_real=receitas_real, despesas_real=despesas_real)


    @app.route('/legacy/projetos/<int:id>/editar', methods=['GET', 'POST'])
    def projeto_edit(id):
        conn = get_db()
        projeto = conn.execute('SELECT * FROM projetos WHERE id=?', (id,)).fetchone()
        if request.method == 'POST':
            conn.execute(
                'UPDATE projetos SET nome=?, descricao=?, objetivos=?, data_inicio=?, data_fim=?, estado=? WHERE id=?',
                (request.form['nome'], request.form['descricao'], request.form['objetivos'],
                 request.form['data_inicio'], request.form['data_fim'], request.form['estado'], id)
            )
            conn.commit()
            conn.close()
            flash('Projeto atualizado!', 'success')
            return redirect(url_for('projeto_detail', id=id))
        conn.close()
        return render_template('projetos/form.html', projeto=projeto)


    @app.route('/legacy/projetos/<int:id>/eliminar', methods=['POST'])
    def projeto_delete(id):
        conn = get_db()
        conn.execute('DELETE FROM projetos WHERE id=?', (id,))
        conn.commit()
        conn.close()
        flash('Projeto eliminado.', 'warning')
        return redirect(url_for('projetos_list'))


    # --- Parceiros ----------------------------------------------------------------

    @app.route('/legacy/parceiros')
    def parceiros_list():
        conn = get_db()
        parceiros = conn.execute('SELECT * FROM parceiros ORDER BY nome').fetchall()
        conn.close()
        return render_template('parceiros/list.html', parceiros=parceiros)


    @app.route('/legacy/parceiros/novo', methods=['GET', 'POST'])
    def parceiro_create():
        if request.method == 'POST':
            conn = get_db()
            conn.execute(
                'INSERT INTO parceiros (nome, tipo, contacto, email, telefone) VALUES (?,?,?,?,?)',
                (request.form['nome'], request.form['tipo'], request.form['contacto'],
                 request.form['email'], request.form['telefone'])
            )
            conn.commit()
            conn.close()
            flash('Parceiro adicionado!', 'success')
            return redirect(url_for('parceiros_list'))
        return render_template('parceiros/form.html', parceiro=None)


    @app.route('/legacy/parceiros/<int:id>/editar', methods=['GET', 'POST'])
    def parceiro_edit(id):
        conn = get_db()
        parceiro = conn.execute('SELECT * FROM parceiros WHERE id=?', (id,)).fetchone()
        if request.method == 'POST':
            conn.execute(
                'UPDATE parceiros SET nome=?, tipo=?, contacto=?, email=?, telefone=? WHERE id=?',
                (request.form['nome'], request.form['tipo'], request.form['contacto'],
                 request.form['email'], request.form['telefone'], id)
            )
            conn.commit()
            conn.close()
            flash('Parceiro atualizado!', 'success')
            return redirect(url_for('parceiros_list'))
        conn.close()
        return render_template('parceiros/form.html', parceiro=parceiro)


    @app.route('/legacy/parceiros/<int:id>/eliminar', methods=['POST'])
    def parceiro_delete(id):
        conn = get_db()
        conn.execute('DELETE FROM parceiros WHERE id=?', (id,))
        conn.commit()
        conn.close()
        flash('Parceiro eliminado.', 'warning')
        return redirect(url_for('parceiros_list'))


    @app.route('/legacy/projetos/<int:projeto_id>/parceiros/adicionar', methods=['POST'])
    def projeto_adicionar_parceiro(projeto_id):
        conn = get_db()
        conn.execute(
            'INSERT OR IGNORE INTO projeto_parceiro (projeto_id, parceiro_id, papel) VALUES (?,?,?)',
            (projeto_id, request.form['parceiro_id'], request.form['papel'])
        )
        conn.commit()
        conn.close()
        flash('Parceiro associado ao projeto!', 'success')
        return redirect(url_for('projeto_detail', id=projeto_id))


    @app.route('/legacy/projetos/<int:projeto_id>/parceiros/<int:parceiro_id>/remover', methods=['POST'])
    def projeto_remover_parceiro(projeto_id, parceiro_id):
        conn = get_db()
        conn.execute(
            'DELETE FROM projeto_parceiro WHERE projeto_id=? AND parceiro_id=?',
            (projeto_id, parceiro_id)
        )
        conn.commit()
        conn.close()
        return redirect(url_for('projeto_detail', id=projeto_id))


    # --- Tarefas ------------------------------------------------------------------

    @app.route('/projetos/<int:projeto_id>/tarefas/nova', methods=['POST'])
    def tarefa_create(projeto_id):
        conn = get_db()
        conn.execute(
            'INSERT INTO tarefas (projeto_id, nome, descricao, responsavel, data_inicio, data_fim, prioridade, estado) VALUES (?,?,?,?,?,?,?,?)',
            (projeto_id, request.form['nome'], request.form['descricao'],
             request.form['responsavel'], request.form['data_inicio'],
             request.form['data_fim'], request.form['prioridade'], request.form['estado'])
        )
        conn.commit()
        conn.close()
        flash('Tarefa adicionada!', 'success')
        return redirect(url_for('projeto_detail', id=projeto_id))


    @app.route('/tarefas/<int:id>/estado', methods=['POST'])
    def tarefa_update_estado(id):
        conn = get_db()
        tarefa = conn.execute('SELECT projeto_id FROM tarefas WHERE id=?', (id,)).fetchone()
        conn.execute('UPDATE tarefas SET estado=? WHERE id=?', (request.form['estado'], id))
        conn.commit()
        conn.close()
        return redirect(url_for('projeto_detail', id=tarefa['projeto_id']))


    @app.route('/tarefas/<int:id>/eliminar', methods=['POST'])
    def tarefa_delete(id):
        conn = get_db()
        tarefa = conn.execute('SELECT projeto_id FROM tarefas WHERE id=?', (id,)).fetchone()
        conn.execute('DELETE FROM tarefas WHERE id=?', (id,))
        conn.commit()
        conn.close()
        return redirect(url_for('projeto_detail', id=tarefa['projeto_id']))


    # --- Milestones ---------------------------------------------------------------

    @app.route('/projetos/<int:projeto_id>/milestones/novo', methods=['POST'])
    def milestone_create(projeto_id):
        conn = get_db()
        conn.execute(
            'INSERT INTO milestones (projeto_id, nome, descricao, data_prevista, estado) VALUES (?,?,?,?,?)',
            (projeto_id, request.form['nome'], request.form['descricao'],
             request.form['data_prevista'], request.form['estado'])
        )
        conn.commit()
        conn.close()
        flash('Milestone adicionado!', 'success')
        return redirect(url_for('projeto_detail', id=projeto_id))


    @app.route('/milestones/<int:id>/concluir', methods=['POST'])
    def milestone_concluir(id):
        conn = get_db()
        ms = conn.execute('SELECT projeto_id FROM milestones WHERE id=?', (id,)).fetchone()
        conn.execute(
            "UPDATE milestones SET estado='Concluído', data_concluida=? WHERE id=?",
            (datetime.now().strftime('%Y-%m-%d'), id)
        )
        conn.commit()
        conn.close()
        return redirect(url_for('projeto_detail', id=ms['projeto_id']))


    @app.route('/milestones/<int:id>/eliminar', methods=['POST'])
    def milestone_delete(id):
        conn = get_db()
        ms = conn.execute('SELECT projeto_id FROM milestones WHERE id=?', (id,)).fetchone()
        conn.execute('DELETE FROM milestones WHERE id=?', (id,))
        conn.commit()
        conn.close()
        return redirect(url_for('projeto_detail', id=ms['projeto_id']))


    # --- Orçamento ----------------------------------------------------------------

    @app.route('/projetos/<int:projeto_id>/orcamento/novo', methods=['POST'])
    def orcamento_create(projeto_id):
        conn = get_db()
        conn.execute(
            'INSERT INTO orcamento (projeto_id, tipo, categoria, descricao, valor_previsto, valor_real) VALUES (?,?,?,?,?,?)',
            (projeto_id, request.form['tipo'], request.form['categoria'],
             request.form['descricao'],
             float(request.form['valor_previsto'] or 0),
             float(request.form['valor_real'] or 0))
        )
        conn.commit()
        conn.close()
        flash('Rubrica de orçamento adicionada!', 'success')
        return redirect(url_for('projeto_detail', id=projeto_id))


    @app.route('/orcamento/<int:id>/eliminar', methods=['POST'])
    def orcamento_delete(id):
        conn = get_db()
        item = conn.execute('SELECT projeto_id FROM orcamento WHERE id=?', (id,)).fetchone()
        conn.execute('DELETE FROM orcamento WHERE id=?', (id,))
        conn.commit()
        conn.close()
        return redirect(url_for('projeto_detail', id=item['projeto_id']))



