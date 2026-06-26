from __future__ import annotations

from datetime import datetime

from coopgest.db import row_to_dict


def build_project_executive_report(conn, projeto_id):
    projeto = conn.execute('SELECT * FROM projetos WHERE id=?', (projeto_id,)).fetchone()
    if not projeto:
        return None

    tarefas = [row_to_dict(row) for row in conn.execute(
        'SELECT * FROM tarefas WHERE projeto_id=? ORDER BY data_fim ASC', (projeto_id,)
    ).fetchall()]
    milestones = [row_to_dict(row) for row in conn.execute(
        'SELECT * FROM milestones WHERE projeto_id=? ORDER BY data_prevista ASC', (projeto_id,)
    ).fetchall()]
    orcamento = [row_to_dict(row) for row in conn.execute(
        'SELECT * FROM orcamento WHERE projeto_id=? ORDER BY tipo, categoria', (projeto_id,)
    ).fetchall()]
    funding = [row_to_dict(row) for row in conn.execute(
        'SELECT * FROM fontes_financiamento WHERE projeto_id=? ORDER BY criado_em ASC', (projeto_id,)
    ).fetchall()]
    riscos = [row_to_dict(row) for row in conn.execute(
        'SELECT * FROM riscos WHERE projeto_id=? ORDER BY criado_em ASC', (projeto_id,)
    ).fetchall()]
    beneficiarios = [row_to_dict(row) for row in conn.execute(
        'SELECT * FROM beneficiarios WHERE projeto_id=? ORDER BY data_registo DESC', (projeto_id,)
    ).fetchall()]
    impacto = [row_to_dict(row) for row in conn.execute(
        'SELECT * FROM impacto_metricas WHERE projeto_id=? ORDER BY categoria, nome', (projeto_id,)
    ).fetchall()]
    parceiros_count = conn.execute(
        'SELECT COUNT(*) FROM projeto_parceiro WHERE projeto_id=?', (projeto_id,)
    ).fetchone()[0]

    today = datetime.now().date()

    def parse_date(value):
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value)[:10]).date()
        except ValueError:
            return None

    tarefas_total = len(tarefas)
    tarefas_concluidas = sum(1 for t in tarefas if t.get('estado') == 'Concluída')
    tarefas_atrasadas = [
        t for t in tarefas
        if t.get('estado') != 'Concluída'
        and parse_date(t.get('data_fim'))
        and parse_date(t.get('data_fim')) < today
    ]
    tarefas_criticas = [
        t for t in tarefas
        if t.get('estado') != 'Concluída'
        and str(t.get('prioridade', '')).lower() in {'alta', 'high', 'urgente'}
    ]
    milestones_abertos = [m for m in milestones if m.get('estado') != 'Concluído']
    milestones_proximos = [
        m for m in milestones_abertos
        if parse_date(m.get('data_prevista'))
        and 0 <= (parse_date(m.get('data_prevista')) - today).days <= 14
    ]
    milestones_atrasados = [
        m for m in milestones_abertos
        if parse_date(m.get('data_prevista'))
        and parse_date(m.get('data_prevista')) < today
    ]

    receitas_previstas = sum(float(i.get('valor_previsto') or 0) for i in orcamento if i.get('tipo') == 'Receita')
    receitas_reais = sum(float(i.get('valor_real') or 0) for i in orcamento if i.get('tipo') == 'Receita')
    despesas_previstas = sum(float(i.get('valor_previsto') or 0) for i in orcamento if i.get('tipo') == 'Despesa')
    despesas_reais = sum(float(i.get('valor_real') or 0) for i in orcamento if i.get('tipo') == 'Despesa')
    funding_aprovado = sum(float(i.get('valor_aprovado') or 0) for i in funding)
    funding_executado = sum(float(i.get('valor_executado') or 0) for i in funding)
    execucao_financeira = round((receitas_reais / receitas_previstas) * 100) if receitas_previstas else 0
    despesa_execucao = round((despesas_reais / despesas_previstas) * 100) if despesas_previstas else 0
    funding_execucao = round((funding_executado / funding_aprovado) * 100) if funding_aprovado else 0
    progresso_tarefas = round((tarefas_concluidas / tarefas_total) * 100) if tarefas_total else 0

    riscos_abertos = [r for r in riscos if str(r.get('estado', '')).lower() not in {'fechado', 'resolvido', 'mitigado'}]
    riscos_altos = [
        r for r in riscos_abertos
        if str(r.get('impacto', '')).lower() in {'alto', 'alta', 'crítico', 'critico'}
        or str(r.get('probabilidade', '')).lower() in {'alto', 'alta'}
    ]
    total_beneficiarios = sum(int(b.get('numero') or 1) for b in beneficiarios)
    indicadores_com_meta = [m for m in impacto if float(m.get('meta') or 0) > 0]
    indicadores_atingidos = [
        m for m in indicadores_com_meta
        if float(m.get('valor_atual') or 0) >= float(m.get('meta') or 0)
    ]
    impacto_execucao = round((len(indicadores_atingidos) / len(indicadores_com_meta)) * 100) if indicadores_com_meta else 0

    score = 100
    score -= min(30, len(tarefas_atrasadas) * 6)
    score -= min(20, len(milestones_atrasados) * 10)
    score -= min(20, len(riscos_altos) * 8)
    if tarefas_total == 0:
        score -= 15
    if parceiros_count == 0:
        score -= 10
    if receitas_previstas and receitas_reais == 0:
        score -= 10
    score = max(0, min(100, score))
    status = 'Excelente' if score >= 85 else 'Atenção' if score >= 65 else 'Crítico'

    recommendations = []

    def add_recommendation(kind, title, description, priority, url):
        recommendations.append({
            'kind': kind,
            'title': title,
            'description': description,
            'priority': priority,
            'url': url,
        })

    if tarefas_atrasadas:
        add_recommendation('tarefas', 'Rever tarefas atrasadas', f'{len(tarefas_atrasadas)} tarefa(s) estão fora do prazo e podem comprometer a execução.', 'Alta', f'/projeto/{projeto_id}/kanban')
    if milestones_proximos:
        add_recommendation('milestones', 'Preparar entregas próximas', f'{len(milestones_proximos)} milestone(s) vencem nos próximos 14 dias.', 'Média', f'/projeto/{projeto_id}')
    if milestones_atrasados:
        add_recommendation('milestones', 'Regularizar milestones atrasados', f'{len(milestones_atrasados)} milestone(s) já passaram a data prevista.', 'Alta', f'/projeto/{projeto_id}')
    if tarefas_total == 0:
        add_recommendation('planeamento', 'Criar plano de trabalho', 'O projeto ainda não tem tarefas. Defina atividades, responsáveis e prazos.', 'Alta', f'/projeto/{projeto_id}/kanban')
    if riscos_altos:
        add_recommendation('riscos', 'Mitigar riscos críticos', f'{len(riscos_altos)} risco(s) com impacto/probabilidade elevada estão abertos.', 'Alta', f'/projeto/{projeto_id}')
    if parceiros_count == 0:
        add_recommendation('parceiros', 'Associar parceiros', 'Projetos cooperativos precisam de entidades/parceiros visíveis na ficha do projeto.', 'Média', f'/projeto/{projeto_id}')
    if indicadores_com_meta and impacto_execucao < 50:
        add_recommendation('impacto', 'Atualizar indicadores de impacto', 'Menos de metade dos indicadores com meta está atingida.', 'Média', '/impacto')
    if receitas_previstas and execucao_financeira < 25 and progresso_tarefas >= 50:
        add_recommendation('financeiro', 'Rever execução financeira', 'O progresso físico está acima da execução financeira registada.', 'Média', f'/projeto/{projeto_id}')
    if not recommendations:
        add_recommendation('gestao', 'Manter acompanhamento', 'Não foram encontrados alertas críticos. Continue a atualizar progresso, orçamento e impacto.', 'Baixa', f'/projeto/{projeto_id}')

    return {
        'projeto': row_to_dict(projeto),
        'generated_at': datetime.now().isoformat(timespec='seconds'),
        'health': {'score': score, 'status': status},
        'summary': {
            'tarefas_total': tarefas_total,
            'tarefas_concluidas': tarefas_concluidas,
            'tarefas_atrasadas': len(tarefas_atrasadas),
            'tarefas_criticas': len(tarefas_criticas),
            'progresso_tarefas': progresso_tarefas,
            'milestones_total': len(milestones),
            'milestones_proximos': len(milestones_proximos),
            'milestones_atrasados': len(milestones_atrasados),
            'riscos_abertos': len(riscos_abertos),
            'riscos_altos': len(riscos_altos),
            'parceiros': parceiros_count,
            'beneficiarios': total_beneficiarios,
            'indicadores_impacto': len(impacto),
            'impacto_execucao': impacto_execucao,
        },
        'finance': {
            'receitas_previstas': receitas_previstas,
            'receitas_reais': receitas_reais,
            'despesas_previstas': despesas_previstas,
            'despesas_reais': despesas_reais,
            'funding_aprovado': funding_aprovado,
            'funding_executado': funding_executado,
            'execucao_financeira': execucao_financeira,
            'despesa_execucao': despesa_execucao,
            'funding_execucao': funding_execucao,
        },
        'recommendations': recommendations[:8],
        'highlights': {
            'tarefas_atrasadas': tarefas_atrasadas[:5],
            'milestones_proximos': milestones_proximos[:5],
            'riscos_altos': riscos_altos[:5],
        },
    }


def build_portfolio_executive_report(conn, accessible_projects):
    project_reports = []
    recommendations = []
    priority_weight = {'Alta': 0, 'Média': 1, 'Baixa': 2}

    for project in accessible_projects:
        report = build_project_executive_report(conn, project['id'])
        if not report:
            continue
        project_summary = {
            'project_id': project['id'],
            'project_name': project['nome'],
            'estado': project['estado'],
            'health': report['health'],
            'summary': report['summary'],
            'finance': report['finance'],
            'top_recommendations': report['recommendations'][:3],
        }
        project_reports.append(project_summary)
        for recommendation in report['recommendations']:
            recommendations.append({
                **recommendation,
                'project_id': project['id'],
                'project_name': project['nome'],
                'health_score': report['health']['score'],
                'health_status': report['health']['status'],
            })

    recommendations = sorted(
        recommendations,
        key=lambda item: (priority_weight.get(item['priority'], 3), item['health_score'])
    )
    total_projects = len(project_reports)
    avg_health = round(
        sum(project['health']['score'] for project in project_reports) / total_projects
    ) if total_projects else 100
    critical_projects = [
        project for project in project_reports
        if project['health']['status'] == 'Crítico'
    ]
    attention_projects = [
        project for project in project_reports
        if project['health']['status'] == 'Atenção'
    ]

    return {
        'generated_at': datetime.now().isoformat(timespec='seconds'),
        'summary': {
            'total_projects': total_projects,
            'average_health': avg_health,
            'critical_projects': len(critical_projects),
            'attention_projects': len(attention_projects),
            'high_priority_actions': sum(1 for r in recommendations if r['priority'] == 'Alta'),
            'total_beneficiaries': sum(project['summary']['beneficiarios'] for project in project_reports),
            'total_budget': sum(project['finance']['receitas_previstas'] for project in project_reports),
            'executed_budget': sum(project['finance']['receitas_reais'] for project in project_reports),
        },
        'projects': sorted(project_reports, key=lambda project: project['health']['score']),
        'recommendations': recommendations[:12],
    }

