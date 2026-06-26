"""
Script para popular a base de dados CoopGest com o projeto
"Educação Primária no Setor de Cacheu (Guiné-Bissau)"
baseado no cenário de simulação UCP.

Executar: python seed_cacheu.py
"""
import sqlite3
import sys
import os

sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf8', buffering=1)

DB_PATH = 'projetos.db'
if not os.path.exists(DB_PATH):
    print(f'ERRO: {DB_PATH} não encontrado. Arranca o app.py primeiro para criar a BD.')
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# ─── PROJETO ─────────────────────────────────────────────────────────────────
cur.execute("""
INSERT INTO projetos (nome, descricao, objetivos, data_inicio, data_fim, estado, arquivado, privado)
VALUES (?, ?, ?, ?, ?, ?, 0, 0)
""", (
    "Educação Primária no Setor de Cacheu (Guiné-Bissau)",
    (
        "Projeto de intervenção educativa no setor de Cacheu, norte da Guiné-Bissau, "
        "promovido por ONGD com experiência em educação, desenvolvimento comunitário e inclusão social. "
        "O setor caracteriza-se por predominância rural, aldeias dispersas, acesso limitado a serviços "
        "básicos e condições socioeconómicas frágeis. O sistema educativo enfrenta baixas taxas de "
        "matrícula e conclusão do ensino primário, níveis elevados de abandono escolar, escassez de "
        "professores com formação pedagógica adequada, infraestruturas escolares precárias e "
        "insuficiência de materiais didáticos. A diversidade linguística constitui um desafio "
        "pedagógico relevante: muitas crianças iniciam a escolarização sem domínio do português."
    ),
    (
        "1. Melhorar o acesso e a permanência das crianças na escola primária.\n"
        "2. Aumentar a eficácia do processo de ensino-aprendizagem.\n"
        "3. Criar condições favoráveis à continuidade escolar das meninas.\n"
        "4. Reabilitar infraestruturas escolares para condições mínimas adequadas.\n"
        "5. Sensibilizar famílias e comunidades para a valorização da educação.\n"
        "6. Desenvolver estratégias pedagógicas adaptadas à diversidade linguística."
    ),
    "2025-01-15",
    "2026-12-31",
    "Em curso"
))
proj_id = cur.lastrowid
print(f"Projeto criado: ID {proj_id}")

# ─── PARCEIROS ───────────────────────────────────────────────────────────────
parceiros_data = [
    (
        "Ministério da Educação da Guiné-Bissau",
        "Entidade Governamental",
        "Dir. Geral João Té",
        "dgeb@mec.gw",
        "+245 955 001 001",
        "Guiné-Bissau",
        "Entidade pública responsável pela tutela do sistema educativo nacional. "
        "Supervisiona e co-financia intervenções de reforço da educação primária.",
        "Parceiro Institucional"
    ),
    (
        "UNICEF Guiné-Bissau",
        "Organização Internacional",
        "Rep. Country Office",
        "guinea-bissau@unicef.org",
        "+245 955 002 002",
        "Guiné-Bissau",
        "Agência das Nações Unidas para a Infância. Apoia programas de educação inclusiva, "
        "proteção da criança e igualdade de género.",
        "Co-financiador"
    ),
    (
        "Câmara Municipal de Cacheu",
        "Entidade Local",
        "Presidente Binta Camará",
        "cmcacheu@gov.gw",
        "+245 955 003 003",
        "Guiné-Bissau",
        "Autoridade municipal do setor de Cacheu. Facilita a mobilização comunitária e "
        "disponibiliza terrenos para construção/reabilitação de infraestruturas.",
        "Parceiro Operacional"
    ),
    (
        "Associação de Professores de Cacheu",
        "Associação Profissional",
        "Presidente Mamadú Balde",
        "apc@educacao.gw",
        "+245 955 004 004",
        "Guiné-Bissau",
        "Associação que representa os docentes do setor. Colabora na organização das formações "
        "pedagógicas e na disseminação de boas práticas.",
        "Parceiro Técnico"
    ),
    (
        "Fundação Calouste Gulbenkian",
        "Fundação",
        "Dr. Sofia Ferreira",
        "africa@gulbenkian.pt",
        "+351 217 823 000",
        "Portugal",
        "Fundação portuguesa com programa de apoio ao desenvolvimento de países lusófonos. "
        "Co-financia componente de formação e materiais didáticos.",
        "Co-financiador"
    ),
    (
        "Associação de Pais e Encarregados de Educação de Cacheu",
        "Associação Comunitária",
        "Sr. Alfredo Có",
        "",
        "+245 955 005 005",
        "Guiné-Bissau",
        "Estrutura comunitária de base que representa as famílias das crianças beneficiárias. "
        "Participa na sensibilização e na monitorização da frequência escolar.",
        "Parceiro Comunitário"
    ),
]

parceiro_ids = []
for p in parceiros_data:
    cur.execute(
        "INSERT INTO parceiros (nome, tipo, contacto, email, telefone, pais, descricao, papel) "
        "VALUES (?,?,?,?,?,?,?,?)",
        p
    )
    pid = cur.lastrowid
    parceiro_ids.append(pid)
    cur.execute(
        "INSERT INTO projeto_parceiro (projeto_id, parceiro_id, papel) VALUES (?,?,?)",
        (proj_id, pid, p[7])
    )
print(f"Parceiros criados: {len(parceiro_ids)}")

# ─── MILESTONES ──────────────────────────────────────────────────────────────
milestones_data = [
    (
        "M1 — Diagnóstico participativo e mobilização comunitária",
        "Realização de diagnóstico de necessidades nas escolas-alvo, mapeamento de professores "
        "e famílias, sessões de mobilização comunitária com líderes locais e associações de pais.",
        "2025-03-31", None, "Concluído"
    ),
    (
        "M2 — 1.ª Fase de formação pedagógica de professores",
        "Primeiro ciclo de formação (5 dias) com 45 professores de 12 escolas: metodologias ativas, "
        "avaliação formativa e gestão de turmas heterogéneas.",
        "2025-06-30", None, "Concluído"
    ),
    (
        "M3 — Reabilitação de infraestruturas escolares concluída",
        "Obras de reabilitação concluídas em 8 escolas prioritárias: telhados, sanitas separadas "
        "por género, vedação e pintura. Equipamento básico instalado.",
        "2025-09-30", None, "Em curso"
    ),
    (
        "M4 — Materiais didáticos distribuídos (2 000 crianças)",
        "Entrega de kits pedagógicos (manuais, cadernos, material de escrita) a 2 000 crianças "
        "e de guias metodológicos a 45 professores nas 12 escolas.",
        "2025-10-31", None, "Pendente"
    ),
    (
        "M5 — Avaliação intercalar e ajuste do plano operacional",
        "Missão de avaliação intercalar com análise de indicadores de frequência, desempenho "
        "e retenção de meninas. Revisão do plano operacional para o 2.º ano.",
        "2025-12-31", None, "Pendente"
    ),
    (
        "M6 — Programa de retenção de meninas implementado",
        "Bolsas de escolaridade atribuídas a 200 meninas em risco de abandono. "
        "Clube de raparigas ativo em 8 escolas. Mentoras comunitárias formadas.",
        "2026-06-30", None, "Pendente"
    ),
    (
        "M7 — 2.ª Fase de formação pedagógica (abordagem multilingue)",
        "Segundo ciclo de formação com foco em estratégias de ensino bilíngue "
        "(português/crioulo/línguas locais) e literacia emergente.",
        "2026-09-30", None, "Pendente"
    ),
    (
        "M8 — Avaliação final e relatório de projeto",
        "Avaliação de impacto final, sistematização de aprendizagens, relatório final para "
        "financiadores e disseminação de resultados junto das autoridades e comunidades.",
        "2026-12-15", None, "Pendente"
    ),
]

ms_ids = []
for m in milestones_data:
    cur.execute(
        "INSERT INTO milestones (projeto_id, nome, descricao, data_prevista, data_concluida, estado) "
        "VALUES (?,?,?,?,?,?)",
        (proj_id,) + m
    )
    ms_ids.append(cur.lastrowid)
print(f"Milestones criadas: {len(ms_ids)}")

# ─── TAREFAS ─────────────────────────────────────────────────────────────────
# (nome, descricao, responsavel, data_inicio, data_fim, prioridade, estado, tags)
tarefas_data = [
    # DIAGNÓSTICO
    (
        "Mapeamento das escolas-alvo",
        "Identificar e selecionar as 12 escolas de intervenção com base em critérios de necessidade "
        "(taxa de abandono, estado das infraestruturas, distância).",
        "Coordenadora de Campo", "2025-01-20", "2025-02-15", "Alta", "Concluída",
        "diagnóstico,planeamento"
    ),
    (
        "Levantamento de dados de matrícula e abandono",
        "Recolha junto do Ministério da Educação e diretores escolares dos dados de frequência, "
        "matrícula e abandono das escolas-alvo (2023-2024).",
        "Técnico de M&A", "2025-01-20", "2025-02-28", "Alta", "Concluída",
        "diagnóstico,dados"
    ),
    (
        "Sessões de diagnóstico participativo",
        "Focus groups com professores, pais, líderes comunitários e crianças para identificar "
        "barreiras específicas ao acesso e permanência escolar.",
        "Técnico Social", "2025-02-10", "2025-03-15", "Alta", "Concluída",
        "diagnóstico,comunidade"
    ),
    (
        "Relatório de diagnóstico e plano operacional anual",
        "Consolidação dos dados recolhidos em relatório de diagnóstico com prioridades de intervenção "
        "e plano detalhado para o 1.º ano de projeto.",
        "Coordenadora de Projeto", "2025-03-01", "2025-03-31", "Alta", "Concluída",
        "planeamento,relatório"
    ),
    # FORMAÇÃO
    (
        "Conceção do currículo de formação pedagógica",
        "Desenvolvimento do programa de formação de 5 dias (módulos: didática, avaliação, gestão "
        "de sala, necessidades educativas especiais, género).",
        "Especialista em Educação", "2025-03-15", "2025-04-30", "Alta", "Concluída",
        "formação,pedagogia"
    ),
    (
        "Formação de Formadores — ToT",
        "Capacitação dos 5 formadores locais que facilitarão as formações pedagógicas nas escolas-alvo. "
        "3 dias de treino intensivo.",
        "Especialista em Educação", "2025-05-05", "2025-05-09", "Alta", "Em curso",
        "formação,ToT"
    ),
    (
        "1.ª Ronda de formação pedagógica (45 professores)",
        "Formação de 5 dias em dois grupos paralelos (Cacheu Norte / Cacheu Sul). Cobre metodologias "
        "ativas, avaliação formativa e gestão de turmas heterogéneas.",
        "Formadores Locais", "2025-06-02", "2025-06-20", "Alta", "Por fazer",
        "formação,professores"
    ),
    (
        "Visitas de coaching pós-formação",
        "Visitas de acompanhamento a cada professor (2 horas por escola) 8 semanas após a formação, "
        "com feedback e plano de melhoria individual.",
        "Técnico Pedagógico", "2025-08-01", "2025-09-30", "Normal", "Por fazer",
        "formação,acompanhamento"
    ),
    (
        "2.ª Ronda de formação — abordagem multilingue",
        "Formação especializada em ensino bilíngue (português/crioulo/mandinka) e estratégias de "
        "literacia emergente para crianças com diferentes línguas maternas.",
        "Especialista em Linguística", "2026-08-03", "2026-09-26", "Alta", "Por fazer",
        "formação,multilingue"
    ),
    # INFRAESTRUTURAS
    (
        "Avaliação técnica das estruturas escolares",
        "Avaliação por engenheiro civil das 12 escolas: estrutura, cobertura, iluminação, "
        "abastecimento de água e instalações sanitárias.",
        "Engenheiro Civil", "2025-04-01", "2025-04-30", "Alta", "Em curso",
        "infraestrutura,avaliação"
    ),
    (
        "Concurso e adjudicação de empreitadas",
        "Elaboração de cadernos de encargos, lançamento de concurso local, avaliação de propostas "
        "e adjudicação a 2-3 empreiteiros locais.",
        "Gestor Administrativo", "2025-05-01", "2025-05-31", "Alta", "Por fazer",
        "infraestrutura,contratos"
    ),
    (
        "Obras de reabilitação — Lote 1 (escolas 1-4)",
        "Reabilitação de 4 escolas: telhados, paredes, pavimentos, pintura e instalação de sanitas "
        "separadas por género.",
        "Empreiteiro Local A", "2025-06-15", "2025-08-15", "Alta", "Por fazer",
        "infraestrutura,obras"
    ),
    (
        "Obras de reabilitação — Lote 2 (escolas 5-8)",
        "Reabilitação de 4 escolas: telhados, paredes, pavimentos, pintura e instalação de sanitas "
        "separadas por género.",
        "Empreiteiro Local B", "2025-07-01", "2025-09-15", "Alta", "Por fazer",
        "infraestrutura,obras"
    ),
    (
        "Manutenção preventiva das infraestruturas",
        "Inspeção semestral e manutenção preventiva de todas as escolas reabilitadas, "
        "com envolvimento das comunidades na gestão.",
        "Técnico de Manutenção", "2026-03-01", "2026-03-31", "Baixa", "Por fazer",
        "infraestrutura,manutenção"
    ),
    # MATERIAIS
    (
        "Definição e procurement de materiais didáticos",
        "Especificação dos kits pedagógicos (por nível de ensino), consulta ao mercado local "
        "e internacional, negociação e encomenda.",
        "Gestor de Logística", "2025-07-01", "2025-08-31", "Alta", "Por fazer",
        "materiais,logística"
    ),
    (
        "Produção de guias pedagógicos multilingues",
        "Desenvolvimento e impressão de guias metodológicos bilíngues (português/crioulo) para "
        "professores, adaptados ao contexto de Cacheu.",
        "Especialista em Educação", "2025-07-15", "2025-09-30", "Normal", "Por fazer",
        "materiais,conteúdo"
    ),
    (
        "Distribuição de kits escolares (2 000 crianças)",
        "Entrega de kits (manual, caderno, lápis, borracha) a todas as crianças matriculadas nas "
        "12 escolas. Registo de distribuição por escola.",
        "Técnico de Logística", "2025-10-06", "2025-10-24", "Alta", "Por fazer",
        "materiais,distribuição"
    ),
    # SENSIBILIZAÇÃO COMUNITÁRIA
    (
        "Campanha de sensibilização comunitária — 1.ª fase",
        "Sessões de sensibilização em 20 aldeias sobre a importância da educação primária, "
        "obrigatoriedade escolar e benefícios a longo prazo.",
        "Técnico Social", "2025-04-15", "2025-05-31", "Normal", "Em curso",
        "comunidade,sensibilização"
    ),
    (
        "Formação de mentoras comunitárias (género)",
        "Identificação e formação de 24 mulheres líderes comunitárias como mentoras para apoiar "
        "a retenção de meninas na escola e prevenir casamentos precoces.",
        "Responsável de Género", "2025-09-01", "2025-10-31", "Alta", "Por fazer",
        "género,comunidade"
    ),
    (
        "Campanhas de rádio e teatro comunitário",
        "Produção de 12 episódios para rádio comunitária e 4 peças de teatro em crioulo sobre "
        "educação, género e empoderamento feminino.",
        "Técnico de Comunicação", "2025-08-01", "2026-03-31", "Normal", "Por fazer",
        "comunicação,género"
    ),
    # RETENÇÃO DE MENINAS
    (
        "Diagnóstico de meninas em risco de abandono",
        "Identificação, com diretores escolares e mentoras comunitárias, das 200 meninas em situação "
        "de maior vulnerabilidade (pobreza, distância, casamento precoce).",
        "Responsável de Género", "2025-10-01", "2025-10-31", "Alta", "Por fazer",
        "género,diagnóstico"
    ),
    (
        "Programa de bolsas de escolaridade para meninas",
        "Atribuição e gestão de bolsas mensais (equivalente a 5 EUR) a 200 meninas em risco. "
        "Monitorização mensal da frequência como condição de renovação.",
        "Gestor Administrativo", "2025-11-01", "2026-12-31", "Alta", "Por fazer",
        "género,bolsas"
    ),
    (
        "Criação de Clubes de Raparigas em 8 escolas",
        "Estabelecimento de espaços seguros semanais onde as meninas discutem direitos, projetos de "
        "vida, saúde reprodutiva e liderança, facilitados por mentoras.",
        "Responsável de Género", "2026-01-15", "2026-12-31", "Normal", "Por fazer",
        "género,empoderamento"
    ),
    # AVALIAÇÃO E MONITORIZAÇÃO
    (
        "Implementação do sistema de monitorização",
        "Implementação de sistema de registo mensal de frequência e desempenho por escola, "
        "com fichas padronizadas e envio digital à coordenação.",
        "Técnico de M&A", "2025-04-01", "2025-05-15", "Alta", "Em curso",
        "M&A,sistemas"
    ),
    (
        "Avaliação intercalar (mês 12)",
        "Missão de avaliação intercalar: análise de indicadores, entrevistas com beneficiários, "
        "revisão de riscos e ajuste do plano operacional.",
        "Avaliador Externo", "2025-12-01", "2025-12-31", "Alta", "Por fazer",
        "avaliação,relatório"
    ),
    (
        "Avaliação final e sistematização de aprendizagens",
        "Avaliação final de impacto com inquérito a 400 beneficiários, grupos focais e análise "
        "comparativa de indicadores iniciais vs. finais.",
        "Avaliador Externo", "2026-11-01", "2026-12-15", "Alta", "Por fazer",
        "avaliação,impacto"
    ),
]

tarefa_ids = []
for t in tarefas_data:
    cur.execute(
        "INSERT INTO tarefas (projeto_id, nome, descricao, responsavel, data_inicio, data_fim, "
        "prioridade, estado, tags) VALUES (?,?,?,?,?,?,?,?,?)",
        (proj_id,) + t
    )
    tarefa_ids.append(cur.lastrowid)
print(f"Tarefas criadas: {len(tarefa_ids)}")

# ─── ORÇAMENTO ───────────────────────────────────────────────────────────────
orcamento_data = [
    # Receitas
    ("receita", "Financiamento UE", "Contribuição do programa IEDDH (Instrumento Europeu para Democracia e Direitos Humanos)", 280000, 280000),
    ("receita", "Fundação Gulbenkian", "Subsídio para componente de formação e materiais didáticos", 45000, 30000),
    ("receita", "Ministério da Educação GB", "Contribuição em espécie: professores, espaços e transporte local", 15000, 10000),
    ("receita", "UNICEF", "Co-financiamento para programa de retenção de meninas", 35000, 20000),
    ("receita", "Autofinanciamento ONGD", "Contribuição própria da organização promotora", 25000, 25000),
    # Despesas — Pessoal
    ("despesa", "Pessoal", "Coordenadora de Projeto (50% FTE x 24 meses)", 57600, 52000),
    ("despesa", "Pessoal", "Técnico Pedagógico / Especialista em Educação (100% x 18 meses)", 43200, 40000),
    ("despesa", "Pessoal", "Técnico Social e Responsável de Género (100% x 20 meses)", 38400, 35000),
    ("despesa", "Pessoal", "Técnico de M&A (50% x 24 meses)", 28800, 0),
    ("despesa", "Pessoal", "Gestor Administrativo e Logístico (100% x 24 meses)", 33600, 0),
    ("despesa", "Pessoal", "Formadores Locais (5 x honorários)", 12000, 0),
    # Despesas — Infraestruturas
    ("despesa", "Infraestrutura", "Reabilitação de 8 escolas (obras civis, materiais, mão-de-obra)", 96000, 15000),
    ("despesa", "Infraestrutura", "Instalação de sanitários separados por género (12 escolas)", 18000, 0),
    ("despesa", "Infraestrutura", "Mobiliário escolar básico (mesas, bancos) — 12 salas", 14400, 0),
    ("despesa", "Infraestrutura", "Supervisão técnica e fiscalização de obras", 4800, 2000),
    # Despesas — Materiais
    ("despesa", "Materiais Didáticos", "Kits escolares para 2 000 crianças (manual, caderno, lápis)", 24000, 0),
    ("despesa", "Materiais Didáticos", "Guias pedagógicos multilingues (45 exemplares x 4 módulos)", 6300, 0),
    ("despesa", "Materiais Didáticos", "Equipamento informático e audiovisual para formações", 3600, 0),
    # Despesas — Sensibilização e Género
    ("despesa", "Sensibilização", "Campanhas de rádio comunitária (12 episódios)", 2400, 0),
    ("despesa", "Sensibilização", "Teatro comunitário (4 peças, 2 encenações cada)", 3200, 0),
    ("despesa", "Género", "Programa de bolsas para 200 meninas (5 EUR/mês x 14 meses)", 14000, 0),
    ("despesa", "Género", "Formação de 24 mentoras comunitárias", 2400, 0),
    # Despesas — Avaliação e Gestão
    ("despesa", "Avaliação", "Avaliação intercalar e final (consultor externo)", 12000, 0),
    ("despesa", "Avaliação", "Sistema de monitorização e recolha de dados", 4800, 0),
    ("despesa", "Gestão Interna", "Custos de sede e administração (15% dos custos diretos)", 24000, 0),
    ("despesa", "Transporte", "Aluguer de viaturas e combustível (24 meses)", 19200, 3000),
    ("despesa", "Comunicação", "Relatórios de progresso, disseminação e visibilidade", 3600, 0),
]

for o in orcamento_data:
    cur.execute(
        "INSERT INTO orcamento (projeto_id, tipo, categoria, descricao, valor_previsto, valor_real) "
        "VALUES (?,?,?,?,?,?)",
        (proj_id,) + o
    )
print(f"Orcamento: {len(orcamento_data)} linhas")

# ─── FONTES DE FINANCIAMENTO ─────────────────────────────────────────────────
fontes_data = [
    ("União Europeia — IEDDH", "Fundo Europeu", 280000, 280000, "2025-01-01", "2026-12-31", "IEDDH-2024-GB-0047"),
    ("Fundação Calouste Gulbenkian", "Fundação Privada", 45000, 30000, "2025-02-01", "2026-06-30", "FCG-2025/AFRICA-012"),
    ("UNICEF Guiné-Bissau", "Organização Internacional", 35000, 20000, "2025-03-01", "2026-06-30", "UNICEF-GW-EDU-2025"),
    ("Ministério da Educação GB", "Entidade Governamental", 15000, 10000, "2025-01-15", "2026-12-31", "MEC-GB-2025-CACHEU"),
    ("Autofinanciamento ONGD", "Autofinanciamento", 25000, 25000, "2025-01-01", "2026-12-31", "AF-INT-2025"),
]

for f in fontes_data:
    cur.execute(
        "INSERT INTO fontes_financiamento (projeto_id, nome, tipo, valor_aprovado, valor_executado, "
        "data_inicio, data_fim, referencia) VALUES (?,?,?,?,?,?,?,?)",
        (proj_id,) + f
    )
print(f"Fontes de financiamento: {len(fontes_data)}")

# ─── BENEFICIÁRIOS ───────────────────────────────────────────────────────────
beneficiarios_data = [
    (
        "Crianças em idade escolar (6-12 anos)",
        "Grupo", 2000,
        "Beneficiárias diretas inscritas nas 12 escolas-alvo do setor de Cacheu. Incluem crianças "
        "de ambos os géneros, com especial foco em meninas em risco de abandono escolar."
    ),
    (
        "Professores das escolas-alvo",
        "Grupo", 45,
        "Docentes das 12 escolas que receberão formação pedagógica em dois ciclos. "
        "Maioria sem formação pedagógica formal prévia."
    ),
    (
        "Famílias beneficiárias",
        "Grupo", 1500,
        "Famílias das crianças inscritas que participarão em sessões de sensibilização comunitária "
        "e beneficiarão indiretamente do programa."
    ),
    (
        "Meninas em risco de abandono (programa de bolsas)",
        "Grupo", 200,
        "Meninas entre 8-12 anos identificadas em situação de maior vulnerabilidade ao abandono "
        "escolar — pobreza extrema, casamentos precoces, distância excessiva à escola."
    ),
    (
        "Mentoras comunitárias formadas",
        "Grupo", 24,
        "Mulheres líderes locais formadas como mentoras para apoiar a retenção de meninas "
        "e fazer a ponte entre escola e comunidade."
    ),
    (
        "Escolas reabilitadas",
        "Outro", 8,
        "Estabelecimentos escolares que beneficiarão de obras de reabilitação, instalação de "
        "sanitários separados por género e equipamento básico."
    ),
    (
        "Comunidades rurais abrangidas pelas campanhas",
        "Grupo", 35,
        "Aldeias do setor de Cacheu onde serão realizadas campanhas de sensibilização "
        "e sessões de teatro comunitário."
    ),
]

for b in beneficiarios_data:
    cur.execute(
        "INSERT INTO beneficiarios (projeto_id, nome, tipo, numero, descricao) VALUES (?,?,?,?,?)",
        (proj_id,) + b
    )
print(f"Beneficiários: {len(beneficiarios_data)}")

# ─── RISCOS ──────────────────────────────────────────────────────────────────
riscos_data = [
    (
        "Instabilidade política ou conflito no setor de Cacheu",
        "Baixo", "Alto", "Identificado",
        "Manter contacto regular com autoridades locais e parceiros de segurança; "
        "protocolo de evacuação e suspensão temporária de atividades definido."
    ),
    (
        "Resistência de líderes religiosos/tradicionais ao programa de género",
        "Médio", "Alto", "Identificado",
        "Envolver líderes tradicionais desde o início como aliados; adaptar mensagens ao contexto "
        "sociocultural; recrutar mentoras respeitadas localmente."
    ),
    (
        "Dificuldades na contratação de empreiteiros locais qualificados",
        "Médio", "Médio", "Identificado",
        "Identificar empreiteiros alternativos na fase de diagnóstico; simplificar especificações "
        "técnicas; prever assistência técnica de Bissau se necessário."
    ),
    (
        "Atraso nas transferências financeiras da UE",
        "Médio", "Alto", "Identificado",
        "Manter fundo de reserva de 3 meses de funcionamento; priorizar atividades de baixo custo "
        "enquanto aguardam transferência."
    ),
    (
        "Época das chuvas (jun-set) compromete obras e formações presenciais",
        "Alto", "Médio", "Identificado",
        "Planear obras e formações presenciais fora da época das chuvas; garantir que materiais "
        "de construção chegam antes de junho."
    ),
    (
        "Rotatividade de professores formados para outras zonas do país",
        "Médio", "Médio", "Em monitorização",
        "Negociar compromisso de permanência mínima (1 ano) com o Ministério da Educação; "
        "certificação oficial como incentivo à retenção."
    ),
    (
        "Baixa taxa de frequência escolar persistente apesar das bolsas",
        "Baixo", "Alto", "Identificado",
        "Reforçar trabalho com mentoras e visitas domiciliárias; rever valor das bolsas "
        "em função da avaliação intercalar."
    ),
    (
        "Câmbio desfavorável EUR/XOF compromete execução orçamental",
        "Médio", "Baixo", "Identificado",
        "Negociar contratos em moeda local sempre que possível; manter margem de contingência "
        "de 5% no orçamento."
    ),
]

for r in riscos_data:
    cur.execute(
        "INSERT INTO riscos (projeto_id, descricao, probabilidade, impacto, estado, mitigacao) "
        "VALUES (?,?,?,?,?,?)",
        (proj_id,) + r
    )
print(f"Riscos: {len(riscos_data)}")

# ─── MÉTRICAS DE IMPACTO ─────────────────────────────────────────────────────
metricas_data = [
    ("Taxa de matrícula no ensino primário (setor Cacheu)", 52.0, 70.0, "%", "Educação", "ODS 4"),
    ("Taxa de conclusão do ensino primário", 38.0, 58.0, "%", "Educação", "ODS 4"),
    ("Taxa de abandono escolar anual", 22.0, 10.0, "%", "Educação", "ODS 4"),
    ("% meninas matriculadas no 1.º ciclo", 44.0, 55.0, "%", "Igualdade de Género", "ODS 5"),
    ("Professores com formação pedagógica (12 escolas)", 8.0, 45.0, "docentes", "Educação", "ODS 4"),
    ("Escolas com infraestruturas adequadas", 1.0, 8.0, "escolas", "Infraestrutura", "ODS 4"),
    ("Crianças com acesso a materiais didáticos", 240.0, 2000.0, "crianças", "Educação", "ODS 4"),
    ("Meninas beneficiárias de bolsas de escolaridade", 0.0, 200.0, "meninas", "Igualdade de Género", "ODS 5"),
    ("Comunidades com ações de sensibilização", 0.0, 35.0, "comunidades", "Desenvolvimento Comunitário", "ODS 17"),
    ("Mentoras comunitárias ativas", 0.0, 24.0, "pessoas", "Igualdade de Género", "ODS 5"),
]

for m in metricas_data:
    cur.execute(
        "INSERT INTO impacto_metricas (nome, valor_atual, meta, unidade, categoria, ods) "
        "VALUES (?,?,?,?,?,?)",
        m
    )
print(f"Métricas de impacto: {len(metricas_data)}")

# ─── SUBTAREFAS ──────────────────────────────────────────────────────────────
# tarefa_ids[1] = "Levantamento de dados de matrícula e abandono"
for nome, concluida in [
    ("Solicitar dados ao Ministério da Educação", 1),
    ("Recolha de registos em cada escola-alvo", 1),
    ("Compilação e validação da base de dados", 0),
    ("Análise estatística descritiva", 0),
]:
    cur.execute(
        "INSERT INTO subtarefas (tarefa_id, nome, concluida) VALUES (?,?,?)",
        (tarefa_ids[1], nome, concluida)
    )

# tarefa_ids[11] = "Obras de reabilitação — Lote 1 (escolas 1-4)"
for nome in [
    "Preparação do local e demolição pontual",
    "Reparação/substituição de telhados",
    "Revestimento de paredes e pavimentos",
    "Instalação de sanitários separados por género",
    "Pintura exterior e interior",
    "Vistoria final e entrega à escola",
]:
    cur.execute(
        "INSERT INTO subtarefas (tarefa_id, nome, concluida) VALUES (?,?,?)",
        (tarefa_ids[11], nome, 0)
    )

# tarefa_ids[21] = "Programa de bolsas de escolaridade para meninas"
for nome in [
    "Definição de critérios de elegibilidade",
    "Seleção das 200 beneficiárias com mentoras",
    "Abertura de mecanismo de pagamento",
    "Primeiro desembolso (novembro 2025)",
    "Monitorização mensal de frequência",
    "Relatório semestral de bolsas",
]:
    cur.execute(
        "INSERT INTO subtarefas (tarefa_id, nome, concluida) VALUES (?,?,?)",
        (tarefa_ids[21], nome, 0)
    )
print("Subtarefas criadas")

# ─── COMENTÁRIOS ─────────────────────────────────────────────────────────────
comentarios_data = [
    (
        proj_id, "admin",
        "Projeto aprovado pela direção da ONGD em janeiro 2025. Protocolo de parceria assinado "
        "com o Ministério da Educação. Missão de arranque realizada com sucesso em Cacheu.",
        None
    ),
    (
        proj_id, "admin",
        "Diagnóstico participativo concluído. Resultados confirmam elevada taxa de abandono "
        "especialmente nas zonas de Suzana e Caió. Prioridade redobrada para intervenção nessas subzonas.",
        None
    ),
    (
        proj_id, "admin",
        "Avaliação técnica das infraestruturas concluída. Engenheiro civil identificou 3 escolas "
        "que precisam de intervenção urgente no telhado antes da época das chuvas (junho). "
        "Empreitadas a lançar com urgência.",
        None
    ),
]

for c in comentarios_data:
    cur.execute(
        "INSERT INTO comentarios (projeto_id, user_nome, texto, tarefa_id) VALUES (?,?,?,?)",
        c
    )
print("Comentários adicionados")

# ─── VOTAÇÕES ────────────────────────────────────────────────────────────────
votacoes_data = [
    (
        "Aprovação da metodologia de formação pedagógica",
        "Aprovação da abordagem metodológica proposta pelo especialista em educação para os dois "
        "ciclos de formação de professores: metodologias ativas e ensino multilingue. "
        "Apresentação em anexo ao e-mail convocatório.",
        "admin", "aberta", 60, 66, "2025-04-30"
    ),
    (
        "Realocação de 8 000 EUR das obras para bolsas de meninas",
        "Devido a economias nas empreitadas do Lote 2, propõe-se realocar 8 000 EUR do orçamento "
        "de infraestruturas para reforçar o programa de bolsas, aumentando o valor mensal de 5 EUR "
        "para 7 EUR por menina.",
        "admin", "fechada", 50, 75, "2025-09-15"
    ),
    (
        "Contratação de avaliador externo para avaliação final",
        "Aprovação da seleção do Prof. Malam Djaló (Universidade Amílcar Cabral, Bissau) como "
        "avaliador externo independente para a avaliação final. Proposta de honorários: 4 800 EUR.",
        "admin", "aberta", 60, 66, "2026-08-31"
    ),
]

for v in votacoes_data:
    cur.execute(
        "INSERT INTO votacoes (titulo, descricao, proposta_por, estado, quorum, threshold, prazo) "
        "VALUES (?,?,?,?,?,?,?)",
        v
    )
print(f"Votações: {len(votacoes_data)}")

# ─── AUDITORIA ───────────────────────────────────────────────────────────────
cur.execute(
    "INSERT INTO auditoria (user_nome, acao, entidade, entidade_id, detalhes) VALUES (?,?,?,?,?)",
    (
        "admin", "criado", "projeto", proj_id,
        "Projeto 'Educação Primária no Setor de Cacheu' importado a partir do cenário de simulação UCP."
    )
)

conn.commit()
conn.close()

print("\nBase de dados populada com sucesso!")
print(f"  Projeto ID: {proj_id}")
print(f"  Parceiros: {len(parceiros_data)}")
print(f"  Milestones: {len(milestones_data)}")
print(f"  Tarefas: {len(tarefas_data)}")
print(f"  Orcamento: {len(orcamento_data)} linhas")
print(f"  Fontes de financiamento: {len(fontes_data)}")
print(f"  Beneficiarios: {len(beneficiarios_data)}")
print(f"  Riscos: {len(riscos_data)}")
print(f"  Metricas de impacto: {len(metricas_data)}")
