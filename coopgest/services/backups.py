import uuid
from datetime import datetime

from coopgest.db import row_to_dict


def next_available_project_name(conn, base_name):
    base = (base_name or 'Projeto Importado').strip() or 'Projeto Importado'
    candidate = base
    n = 2
    while conn.execute('SELECT 1 FROM projetos WHERE nome=?', (candidate,)).fetchone():
        candidate = f'{base} ({n})'
        n += 1
    return candidate


def fetch_project_backup_payload(conn, project_id):
    project = conn.execute('SELECT * FROM projetos WHERE id=?', (project_id,)).fetchone()
    if not project:
        return None

    tasks = [row_to_dict(r) for r in conn.execute('SELECT * FROM tarefas WHERE projeto_id=?', (project_id,)).fetchall()]
    task_ids = [t['id'] for t in tasks]
    subtasks = []
    task_dependencies = []
    if task_ids:
        ph = ','.join(['?'] * len(task_ids))
        subtasks = [row_to_dict(r) for r in conn.execute(f'SELECT * FROM subtarefas WHERE tarefa_id IN ({ph})', task_ids).fetchall()]
        task_dependencies = [row_to_dict(r) for r in conn.execute(
            f'SELECT * FROM tarefa_dependencias WHERE tarefa_id IN ({ph}) OR depende_de IN ({ph})',
            task_ids + task_ids,
        ).fetchall()]

    votings = [row_to_dict(r) for r in conn.execute('SELECT * FROM votacoes WHERE projeto_id=?', (project_id,)).fetchall()]
    voting_ids = [v['id'] for v in votings]
    votes = []
    if voting_ids:
        ph = ','.join(['?'] * len(voting_ids))
        votes = [row_to_dict(r) for r in conn.execute(f'SELECT * FROM votos WHERE votacao_id IN ({ph})', voting_ids).fetchall()]

    tokens = [row_to_dict(r) for r in conn.execute('SELECT * FROM feedback_tokens WHERE projeto_id=?', (project_id,)).fetchall()]
    token_ids = [t['id'] for t in tokens]
    feedbacks = []
    if token_ids:
        ph = ','.join(['?'] * len(token_ids))
        feedbacks = [row_to_dict(r) for r in conn.execute(f'SELECT * FROM feedbacks WHERE token_id IN ({ph})', token_ids).fetchall()]

    templates = [row_to_dict(r) for r in conn.execute('SELECT * FROM templates WHERE projeto_id=?', (project_id,)).fetchall()]
    template_ids = [t['id'] for t in templates]
    template_milestones = []
    template_tasks = []
    template_budget = []
    if template_ids:
        ph = ','.join(['?'] * len(template_ids))
        template_milestones = [row_to_dict(r) for r in conn.execute(f'SELECT * FROM template_milestones WHERE template_id IN ({ph})', template_ids).fetchall()]
        template_tasks = [row_to_dict(r) for r in conn.execute(f'SELECT * FROM template_tarefas WHERE template_id IN ({ph})', template_ids).fetchall()]
        template_budget = [row_to_dict(r) for r in conn.execute(f'SELECT * FROM template_orcamento WHERE template_id IN ({ph})', template_ids).fetchall()]

    partners = [row_to_dict(r) for r in conn.execute(
        '''SELECT p.* FROM parceiros p
           JOIN projeto_parceiro pp ON pp.parceiro_id = p.id
           WHERE pp.projeto_id=?''',
        (project_id,),
    ).fetchall()]
    project_partner_links = [row_to_dict(r) for r in conn.execute('SELECT * FROM projeto_parceiro WHERE projeto_id=?', (project_id,)).fetchall()]

    team_memberships = [row_to_dict(r) for r in conn.execute(
        '''SELECT u.username, u.nome, pm.papel, pm.criado_em
           FROM projeto_membros pm
           JOIN utilizadores u ON u.id = pm.user_id
           WHERE pm.projeto_id=?''',
        (project_id,),
    ).fetchall()]
    team_skills = [row_to_dict(r) for r in conn.execute(
        '''SELECT u.username, c.nome as competencia_nome, pmc.nivel, pmc.disposto_ensinar, pmc.quer_aprender
           FROM projeto_membro_competencia pmc
           JOIN utilizadores u ON u.id = pmc.user_id
           JOIN competencias c ON c.id = pmc.competencia_id
           WHERE pmc.projeto_id=?''',
        (project_id,),
    ).fetchall()]

    documents = [row_to_dict(r) for r in conn.execute('SELECT * FROM documentos WHERE projeto_id=?', (project_id,)).fetchall()]
    for d in documents:
        d['zip_path'] = f"files/{d['nome_ficheiro']}"

    return {
        'project': row_to_dict(project),
        'tasks': tasks,
        'subtasks': subtasks,
        'task_dependencies': task_dependencies,
        'milestones': [row_to_dict(r) for r in conn.execute('SELECT * FROM milestones WHERE projeto_id=?', (project_id,)).fetchall()],
        'budget': [row_to_dict(r) for r in conn.execute('SELECT * FROM orcamento WHERE projeto_id=?', (project_id,)).fetchall()],
        'funding': [row_to_dict(r) for r in conn.execute('SELECT * FROM fontes_financiamento WHERE projeto_id=?', (project_id,)).fetchall()],
        'comments': [row_to_dict(r) for r in conn.execute('SELECT * FROM comentarios WHERE projeto_id=?', (project_id,)).fetchall()],
        'risks': [row_to_dict(r) for r in conn.execute('SELECT * FROM riscos WHERE projeto_id=?', (project_id,)).fetchall()],
        'beneficiaries': [row_to_dict(r) for r in conn.execute('SELECT * FROM beneficiarios WHERE projeto_id=?', (project_id,)).fetchall()],
        'impact_metrics': [row_to_dict(r) for r in conn.execute('SELECT * FROM impacto_metricas WHERE projeto_id=?', (project_id,)).fetchall()],
        'competencies': [row_to_dict(r) for r in conn.execute('SELECT * FROM competencias WHERE projeto_id=?', (project_id,)).fetchall()],
        'chat_messages': [row_to_dict(r) for r in conn.execute('SELECT * FROM chat_messages WHERE projeto_id=?', (project_id,)).fetchall()],
        'hours': [row_to_dict(r) for r in conn.execute('SELECT * FROM registos_horas WHERE projeto_id=?', (project_id,)).fetchall()],
        'votings': votings,
        'votes': votes,
        'templates': templates,
        'template_milestones': template_milestones,
        'template_tasks': template_tasks,
        'template_budget': template_budget,
        'feedback_tokens': tokens,
        'feedbacks': feedbacks,
        'documents': documents,
        'partners': partners,
        'project_partner_links': project_partner_links,
        'team_memberships': team_memberships,
        'team_skills': team_skills,
    }


def import_project_payload(conn, payload, strategy='duplicate'):
    project = payload.get('project') or {}
    if not project:
        raise ValueError('Projeto inválido no backup')

    existing = conn.execute('SELECT id FROM projetos WHERE nome=?', (project.get('nome', ''),)).fetchone()
    if strategy == 'skip' and existing:
        return {'status': 'skipped', 'reason': 'Projeto já existe', 'source_project_name': project.get('nome', 'Projeto')}
    if strategy == 'replace' and existing:
        conn.execute('DELETE FROM projetos WHERE id=?', (existing['id'],))

    if strategy == 'duplicate':
        project_name = next_available_project_name(conn, project.get('nome', 'Projeto Importado'))
    else:
        project_name = project.get('nome') or next_available_project_name(conn, 'Projeto Importado')

    cur = conn.execute(
        '''INSERT INTO projetos (nome, descricao, objetivos, data_inicio, data_fim, estado, arquivado, privado, criado_em, atualizado_em)
           VALUES (?,?,?,?,?,?,?,?,?,?)''',
        (
            project_name,
            project.get('descricao', ''),
            project.get('objetivos', ''),
            project.get('data_inicio'),
            project.get('data_fim'),
            project.get('estado', 'Planeamento'),
            int(project.get('arquivado', 0) or 0),
            int(project.get('privado', 0) or 0),
            project.get('criado_em') or datetime.now().isoformat(timespec='seconds'),
            project.get('atualizado_em') or datetime.now().isoformat(timespec='seconds'),
        ),
    )
    new_project_id = cur.lastrowid

    task_id_map = {}
    for t in payload.get('tasks', []):
        cur = conn.execute(
            '''INSERT INTO tarefas (projeto_id, nome, descricao, responsavel, data_inicio, data_fim, prioridade, estado, tags, recorrencia, criado_em)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
            (
                new_project_id, t.get('nome', 'Tarefa'), t.get('descricao', ''), t.get('responsavel', ''),
                t.get('data_inicio'), t.get('data_fim'), t.get('prioridade', 'Normal'),
                t.get('estado', 'Por fazer'), t.get('tags', ''), t.get('recorrencia'),
                t.get('criado_em') or datetime.now().isoformat(timespec='seconds'),
            ),
        )
        task_id_map[t.get('id')] = cur.lastrowid

    for st in payload.get('subtasks', []):
        new_task_id = task_id_map.get(st.get('tarefa_id'))
        if not new_task_id:
            continue
        conn.execute('INSERT INTO subtarefas (tarefa_id, nome, concluida, criado_em) VALUES (?,?,?,?)',
                     (new_task_id, st.get('nome', 'Subtarefa'), int(st.get('concluida', 0) or 0), st.get('criado_em') or datetime.now().isoformat(timespec='seconds')))

    for dep in payload.get('task_dependencies', []):
        new_task = task_id_map.get(dep.get('tarefa_id'))
        new_dep = task_id_map.get(dep.get('depende_de'))
        if not new_task or not new_dep or new_task == new_dep:
            continue
        conn.execute('INSERT OR IGNORE INTO tarefa_dependencias (tarefa_id, depende_de) VALUES (?,?)', (new_task, new_dep))

    for m in payload.get('milestones', []):
        conn.execute('''INSERT INTO milestones (projeto_id, nome, descricao, data_prevista, data_concluida, estado, criado_em)
                        VALUES (?,?,?,?,?,?,?)''',
                     (new_project_id, m.get('nome', 'Milestone'), m.get('descricao', ''), m.get('data_prevista'), m.get('data_concluida'), m.get('estado', 'Pendente'), m.get('criado_em') or datetime.now().isoformat(timespec='seconds')))

    for b in payload.get('budget', []):
        conn.execute('''INSERT INTO orcamento (projeto_id, tipo, categoria, descricao, valor_previsto, valor_real, criado_em)
                        VALUES (?,?,?,?,?,?,?)''',
                     (new_project_id, b.get('tipo', 'Despesa'), b.get('categoria', ''), b.get('descricao', ''), float(b.get('valor_previsto', 0) or 0), float(b.get('valor_real', 0) or 0), b.get('criado_em') or datetime.now().isoformat(timespec='seconds')))

    for f in payload.get('funding', []):
        conn.execute('''INSERT INTO fontes_financiamento (projeto_id, nome, tipo, valor_aprovado, valor_executado, data_inicio, data_fim, referencia, criado_em)
                        VALUES (?,?,?,?,?,?,?,?,?)''',
                     (new_project_id, f.get('nome', 'Financiamento'), f.get('tipo', 'Fundo Europeu'), float(f.get('valor_aprovado', 0) or 0), float(f.get('valor_executado', 0) or 0), f.get('data_inicio'), f.get('data_fim'), f.get('referencia', ''), f.get('criado_em') or datetime.now().isoformat(timespec='seconds')))

    for c in payload.get('comments', []):
        conn.execute('INSERT INTO comentarios (projeto_id, tarefa_id, user_nome, texto, criado_em) VALUES (?,?,?,?,?)',
                     (new_project_id, task_id_map.get(c.get('tarefa_id')), c.get('user_nome', 'Sistema'), c.get('texto', ''), c.get('criado_em') or datetime.now().isoformat(timespec='seconds')))

    for r in payload.get('risks', []):
        conn.execute('''INSERT INTO riscos (projeto_id, descricao, probabilidade, impacto, estado, mitigacao, criado_em)
                        VALUES (?,?,?,?,?,?,?)''',
                     (new_project_id, r.get('descricao', ''), r.get('probabilidade', 'Médio'), r.get('impacto', 'Médio'), r.get('estado', 'Identificado'), r.get('mitigacao', ''), r.get('criado_em') or datetime.now().isoformat(timespec='seconds')))

    for b in payload.get('beneficiaries', []):
        conn.execute('INSERT INTO beneficiarios (projeto_id, nome, tipo, numero, descricao, data_registo) VALUES (?,?,?,?,?,?)',
                     (new_project_id, b.get('nome', 'Beneficiário'), b.get('tipo', 'Individual'), int(b.get('numero', 1) or 1), b.get('descricao', ''), b.get('data_registo') or datetime.now().isoformat(timespec='seconds')))

    for im in payload.get('impact_metrics', []):
        conn.execute('''INSERT INTO impacto_metricas (nome, valor_atual, meta, unidade, categoria, ods, projeto_id, criado_em, atualizado_em)
                        VALUES (?,?,?,?,?,?,?,?,?)''',
                     (im.get('nome', 'Métrica'), float(im.get('valor_atual', 0) or 0), float(im.get('meta', 0) or 0), im.get('unidade', ''), im.get('categoria', 'social'), im.get('ods', ''), new_project_id, im.get('criado_em') or datetime.now().isoformat(timespec='seconds'), im.get('atualizado_em') or datetime.now().isoformat(timespec='seconds')))

    for comp in payload.get('competencies', []):
        conn.execute('INSERT INTO competencias (nome, categoria, projeto_id, criado_em, atualizado_em) VALUES (?,?,?,?,?)',
                     (comp.get('nome', 'Competência'), comp.get('categoria', 'técnica'), new_project_id, comp.get('criado_em') or datetime.now().isoformat(timespec='seconds'), comp.get('atualizado_em') or datetime.now().isoformat(timespec='seconds')))

    for msg in payload.get('chat_messages', []):
        conn.execute('INSERT INTO chat_messages (projeto_id, user_nome, texto, criado_em) VALUES (?,?,?,?)',
                     (new_project_id, msg.get('user_nome', 'Sistema'), msg.get('texto', ''), msg.get('criado_em') or datetime.now().isoformat(timespec='seconds')))

    for h in payload.get('hours', []):
        conn.execute('INSERT INTO registos_horas (tarefa_id, projeto_id, user_nome, horas, descricao, data_registo) VALUES (?,?,?,?,?,?)',
                     (task_id_map.get(h.get('tarefa_id')), new_project_id, h.get('user_nome', 'Sistema'), float(h.get('horas', 0) or 0), h.get('descricao', ''), h.get('data_registo') or datetime.now().isoformat(timespec='seconds')))

    voting_id_map = {}
    for v in payload.get('votings', []):
        cur = conn.execute(
            '''INSERT INTO votacoes (titulo, descricao, proposta_por, estado, quorum, threshold, prazo, projeto_id, criado_em)
               VALUES (?,?,?,?,?,?,?,?,?)''',
            (
                v.get('titulo', 'Votação'),
                v.get('descricao', ''),
                v.get('proposta_por', 'Sistema'),
                v.get('estado', 'aberta'),
                int(v.get('quorum', 50) or 50),
                int(v.get('threshold', 66) or 66),
                v.get('prazo') or datetime.now().strftime('%Y-%m-%d'),
                new_project_id,
                v.get('criado_em') or datetime.now().isoformat(timespec='seconds'),
            ),
        )
        voting_id_map[v.get('id')] = cur.lastrowid

    for vote in payload.get('votes', []):
        new_voting_id = voting_id_map.get(vote.get('votacao_id'))
        if not new_voting_id:
            continue
        conn.execute(
            'INSERT OR IGNORE INTO votos (votacao_id, username, nome, voto, criado_em) VALUES (?,?,?,?,?)',
            (
                new_voting_id,
                vote.get('username', f'user-{uuid.uuid4().hex[:8]}'),
                vote.get('nome', 'Membro'),
                vote.get('voto', 'abstencao'),
                vote.get('criado_em') or datetime.now().isoformat(timespec='seconds'),
            ),
        )

    template_id_map = {}
    for t in payload.get('templates', []):
        cur = conn.execute(
            'INSERT INTO templates (nome, descricao, projeto_id, criado_em) VALUES (?,?,?,?)',
            (t.get('nome', 'Template'), t.get('descricao', ''), new_project_id, t.get('criado_em') or datetime.now().isoformat(timespec='seconds')),
        )
        template_id_map[t.get('id')] = cur.lastrowid

    for tm in payload.get('template_milestones', []):
        new_template_id = template_id_map.get(tm.get('template_id'))
        if not new_template_id:
            continue
        conn.execute(
            'INSERT INTO template_milestones (template_id, nome, descricao, dias_offset) VALUES (?,?,?,?)',
            (new_template_id, tm.get('nome', 'Milestone'), tm.get('descricao', ''), int(tm.get('dias_offset', 0) or 0)),
        )

    for tt in payload.get('template_tasks', []):
        new_template_id = template_id_map.get(tt.get('template_id'))
        if not new_template_id:
            continue
        conn.execute(
            'INSERT INTO template_tarefas (template_id, nome, descricao, prioridade, dias_offset) VALUES (?,?,?,?,?)',
            (new_template_id, tt.get('nome', 'Tarefa'), tt.get('descricao', ''), tt.get('prioridade', 'Normal'), int(tt.get('dias_offset', 0) or 0)),
        )

    for tb in payload.get('template_budget', []):
        new_template_id = template_id_map.get(tb.get('template_id'))
        if not new_template_id:
            continue
        conn.execute(
            'INSERT INTO template_orcamento (template_id, tipo, categoria, descricao, valor_previsto) VALUES (?,?,?,?,?)',
            (new_template_id, tb.get('tipo', 'Despesa'), tb.get('categoria', ''), tb.get('descricao', ''), float(tb.get('valor_previsto', 0) or 0)),
        )

    feedback_token_map = {}
    for token in payload.get('feedback_tokens', []):
        cur = conn.execute(
            'INSERT INTO feedback_tokens (token, projeto_id, titulo, descricao, ativo, criado_em) VALUES (?,?,?,?,?,?)',
            (
                uuid.uuid4().hex,
                new_project_id,
                token.get('titulo', 'Feedback'),
                token.get('descricao', ''),
                int(token.get('ativo', 1) or 1),
                token.get('criado_em') or datetime.now().isoformat(timespec='seconds'),
            ),
        )
        feedback_token_map[token.get('id')] = cur.lastrowid

    for fb in payload.get('feedbacks', []):
        new_token_id = feedback_token_map.get(fb.get('token_id'))
        if not new_token_id:
            continue
        conn.execute(
            'INSERT INTO feedbacks (token_id, nome_respondente, resposta, avaliacao, criado_em) VALUES (?,?,?,?,?)',
            (
                new_token_id,
                fb.get('nome_respondente', 'Anónimo'),
                fb.get('resposta', ''),
                int(fb.get('avaliacao', 3) or 3),
                fb.get('criado_em') or datetime.now().isoformat(timespec='seconds'),
            ),
        )

    for member in payload.get('team_memberships', []):
        user = conn.execute('SELECT id FROM utilizadores WHERE username=?', (member.get('username', ''),)).fetchone()
        if not user:
            continue
        conn.execute(
            'INSERT OR IGNORE INTO projeto_membros (projeto_id, user_id, papel, criado_em) VALUES (?,?,?,?)',
            (new_project_id, user['id'], member.get('papel', 'membro'), member.get('criado_em') or datetime.now().isoformat(timespec='seconds')),
        )

    for skill in payload.get('team_skills', []):
        user = conn.execute('SELECT id FROM utilizadores WHERE username=?', (skill.get('username', ''),)).fetchone()
        if not user:
            continue
        comp = conn.execute('SELECT id FROM competencias WHERE projeto_id=? AND nome=?', (new_project_id, skill.get('competencia_nome', ''))).fetchone()
        if not comp:
            continue
        conn.execute(
            '''INSERT OR IGNORE INTO projeto_membro_competencia
               (projeto_id, user_id, competencia_id, nivel, disposto_ensinar, quer_aprender, criado_em, atualizado_em)
               VALUES (?,?,?,?,?,?,?,?)''',
            (
                new_project_id,
                user['id'],
                comp['id'],
                int(skill.get('nivel', 3) or 3),
                int(skill.get('disposto_ensinar', 0) or 0),
                int(skill.get('quer_aprender', 0) or 0),
                datetime.now().isoformat(timespec='seconds'),
                datetime.now().isoformat(timespec='seconds'),
            ),
        )

    partner_id_map = {}
    for p in payload.get('partners', []):
        existing_partner = conn.execute(
            'SELECT id FROM parceiros WHERE lower(nome)=lower(?) AND lower(coalesce(email, ""))=lower(?) LIMIT 1',
            (p.get('nome', ''), p.get('email', '') or ''),
        ).fetchone()
        if existing_partner:
            partner_id_map[p.get('id')] = existing_partner['id']
            continue
        cur = conn.execute('''INSERT INTO parceiros (nome, tipo, contacto, email, telefone, pais, descricao, papel, criado_em)
                              VALUES (?,?,?,?,?,?,?,?,?)''',
                           (p.get('nome', 'Parceiro'), p.get('tipo', ''), p.get('contacto', ''), p.get('email', ''), p.get('telefone', ''), p.get('pais', 'Portugal'), p.get('descricao', ''), p.get('papel', ''), p.get('criado_em') or datetime.now().isoformat(timespec='seconds')))
        partner_id_map[p.get('id')] = cur.lastrowid

    for link in payload.get('project_partner_links', []):
        mapped_partner = partner_id_map.get(link.get('parceiro_id'))
        if not mapped_partner:
            continue
        conn.execute('INSERT OR IGNORE INTO projeto_parceiro (projeto_id, parceiro_id, papel, criado_em) VALUES (?,?,?,?)',
                     (new_project_id, mapped_partner, link.get('papel', ''), link.get('criado_em') or datetime.now().isoformat(timespec='seconds')))

    return {
        'status': 'imported',
        'source_project_name': project.get('nome', 'Projeto'),
        'new_project_id': new_project_id,
        'project_name': project_name,
    }



