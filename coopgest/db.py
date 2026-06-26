import contextlib
import os
import sqlite3
from werkzeug.security import generate_password_hash

import coopgest.config
from coopgest.migrations import apply_migrations


def get_db():
    conn = sqlite3.connect(coopgest.config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


@contextlib.contextmanager
def get_db_ctx():
    conn = get_db()
    try:
        yield conn
    finally:
        conn.close()


def row_to_dict(row):
    return dict(row) if row else None


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS projetos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            objetivos TEXT DEFAULT '',
            data_inicio TEXT,
            data_fim TEXT,
            estado TEXT DEFAULT 'Em curso',
            arquivado INTEGER DEFAULT 0,
            privado INTEGER DEFAULT 0,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS parceiros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            tipo TEXT DEFAULT '',
            contacto TEXT DEFAULT '',
            email TEXT DEFAULT '',
            telefone TEXT DEFAULT '',
            pais TEXT DEFAULT 'Portugal',
            descricao TEXT DEFAULT '',
            papel TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS projeto_parceiro (
            projeto_id INTEGER NOT NULL,
            parceiro_id INTEGER NOT NULL,
            papel TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (projeto_id, parceiro_id),
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
            FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            responsavel TEXT DEFAULT '',
            data_inicio TEXT,
            data_fim TEXT,
            prioridade TEXT DEFAULT 'Normal',
            estado TEXT DEFAULT 'Por fazer',
            tags TEXT DEFAULT '',
            recorrencia TEXT DEFAULT NULL,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            data_prevista TEXT,
            data_concluida TEXT,
            estado TEXT DEFAULT 'Pendente',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS orcamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            categoria TEXT DEFAULT '',
            descricao TEXT DEFAULT '',
            valor_previsto REAL DEFAULT 0,
            valor_real REAL DEFAULT 0,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS movimentos_financeiros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            tipo TEXT NOT NULL DEFAULT 'Despesa',
            categoria TEXT DEFAULT '',
            descricao TEXT DEFAULT '',
            entidade TEXT DEFAULT '',
            referencia TEXT DEFAULT '',
            valor REAL NOT NULL DEFAULT 0,
            moeda TEXT DEFAULT 'EUR',
            taxa_cambio REAL DEFAULT 1.0,
            data_movimento TEXT NOT NULL DEFAULT CURRENT_DATE,
            estado TEXT DEFAULT 'Confirmado',
            notas TEXT DEFAULT '',
            anexo_nome TEXT DEFAULT '',
            anexo_ficheiro TEXT DEFAULT '',
            anexo_tipo TEXT DEFAULT '',
            anexo_tamanho INTEGER DEFAULT 0,
            criado_por TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS impacto_metricas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            valor_atual REAL NOT NULL DEFAULT 0,
            meta REAL NOT NULL DEFAULT 0,
            unidade TEXT DEFAULT '',
            categoria TEXT NOT NULL,
            ods TEXT DEFAULT '',
            projeto_id INTEGER,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS impacto_quadro_logico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            nivel TEXT DEFAULT 'Resultado',
            resultado TEXT NOT NULL,
            indicador TEXT NOT NULL,
            unidade TEXT DEFAULT '',
            fonte_verificacao TEXT DEFAULT '',
            baseline REAL DEFAULT 0,
            meta REAL DEFAULT 0,
            valor_atual REAL DEFAULT 0,
            estado TEXT DEFAULT 'Em acompanhamento',
            proxima_revisao TEXT DEFAULT '',
            frequencia_medicao TEXT DEFAULT 'Trimestral',
            responsavel_medicao TEXT DEFAULT '',
            pressupostos TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS competencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            categoria TEXT NOT NULL,
            projeto_id INTEGER,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS equipa_membros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            iniciais TEXT NOT NULL,
            cor TEXT NOT NULL,
            papel TEXT DEFAULT '',
            disponibilidade INTEGER DEFAULT 100,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS membro_competencia (
            membro_id INTEGER NOT NULL,
            competencia_id INTEGER NOT NULL,
            nivel INTEGER NOT NULL,
            disposto_ensinar INTEGER NOT NULL DEFAULT 0,
            quer_aprender INTEGER NOT NULL DEFAULT 0,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (membro_id, competencia_id),
            FOREIGN KEY (membro_id) REFERENCES equipa_membros(id) ON DELETE CASCADE,
            FOREIGN KEY (competencia_id) REFERENCES competencias(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS utilizadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            nome TEXT NOT NULL,
            papel TEXT NOT NULL DEFAULT 'membro',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS votacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            proposta_por TEXT NOT NULL,
            estado TEXT DEFAULT 'aberta',
            quorum INTEGER DEFAULT 50,
            threshold INTEGER DEFAULT 66,
            prazo TEXT NOT NULL,
            projeto_id INTEGER,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS votos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            votacao_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            nome TEXT NOT NULL,
            voto TEXT NOT NULL,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(votacao_id, username),
            FOREIGN KEY (votacao_id) REFERENCES votacoes(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS documentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            nome_ficheiro TEXT NOT NULL,
            tipo TEXT NOT NULL,
            categoria TEXT DEFAULT 'Outros',
            tamanho INTEGER DEFAULT 0,
            uploader TEXT NOT NULL,
            projeto_id INTEGER,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS notificacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            destinatario TEXT,
            assunto TEXT,
            mensagem TEXT,
            estado TEXT DEFAULT 'enviado',
            lida INTEGER DEFAULT 0,
            url TEXT DEFAULT NULL,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS convites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            papel TEXT DEFAULT 'membro',
            criado_por INTEGER,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            usado INTEGER DEFAULT 0,
            usado_em TEXT
        );

        CREATE TABLE IF NOT EXISTS fontes_financiamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            tipo TEXT DEFAULT 'Fundo Europeu',
            valor_aprovado REAL DEFAULT 0,
            valor_executado REAL DEFAULT 0,
            moeda TEXT DEFAULT 'EUR',
            data_inicio TEXT,
            data_fim TEXT,
            referencia TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS comentarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            tarefa_id INTEGER DEFAULT NULL,
            user_nome TEXT NOT NULL,
            texto TEXT NOT NULL,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
            FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS riscos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            descricao TEXT NOT NULL,
            probabilidade TEXT DEFAULT 'Médio',
            impacto TEXT DEFAULT 'Médio',
            estado TEXT DEFAULT 'Identificado',
            mitigacao TEXT DEFAULT '',
            dono TEXT DEFAULT '',
            proxima_revisao TEXT DEFAULT '',
            plano_contingencia TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS beneficiarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            tipo TEXT DEFAULT 'Individual',
            numero INTEGER DEFAULT 1,
            descricao TEXT DEFAULT '',
            localizacao TEXT DEFAULT '',
            arquivado INTEGER DEFAULT 0,
            data_registo TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS beneficiarios_desagregacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            beneficiario_id INTEGER NOT NULL,
            projeto_id INTEGER NOT NULL,
            dimensao TEXT NOT NULL,
            categoria TEXT NOT NULL,
            numero INTEGER DEFAULT 0,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (beneficiario_id) REFERENCES beneficiarios(id) ON DELETE CASCADE,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS subtarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tarefa_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            concluida INTEGER DEFAULT 0,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS registos_horas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tarefa_id INTEGER,
            projeto_id INTEGER NOT NULL,
            user_nome TEXT NOT NULL,
            horas REAL NOT NULL,
            descricao TEXT DEFAULT '',
            data_registo TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE SET NULL,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            user_nome TEXT NOT NULL,
            texto TEXT NOT NULL,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tarefa_dependencias (
            tarefa_id INTEGER NOT NULL,
            depende_de INTEGER NOT NULL,
            PRIMARY KEY (tarefa_id, depende_de),
            FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
            FOREIGN KEY (depende_de) REFERENCES tarefas(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS projeto_membros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            papel TEXT DEFAULT 'membro',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(projeto_id, user_id),
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES utilizadores(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS projeto_membro_competencia (
            projeto_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            competencia_id INTEGER NOT NULL,
            nivel INTEGER NOT NULL,
            disposto_ensinar INTEGER NOT NULL DEFAULT 0,
            quer_aprender INTEGER NOT NULL DEFAULT 0,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (projeto_id, user_id, competencia_id),
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
            FOREIGN KEY (competencia_id) REFERENCES competencias(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS auditoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_nome TEXT NOT NULL,
            acao TEXT NOT NULL,
            entidade TEXT NOT NULL,
            entidade_id INTEGER,
            projeto_id INTEGER,
            detalhes TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            projeto_id INTEGER,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS template_milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            dias_offset INTEGER DEFAULT 0,
            FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS template_tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            prioridade TEXT DEFAULT 'Normal',
            dias_offset INTEGER DEFAULT 0,
            FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS template_orcamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            categoria TEXT DEFAULT '',
            descricao TEXT DEFAULT '',
            valor_previsto REAL DEFAULT 0,
            FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS feedback_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL UNIQUE,
            projeto_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            ativo INTEGER DEFAULT 1,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS feedbacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_id INTEGER NOT NULL,
            nome_respondente TEXT DEFAULT 'Anónimo',
            resposta TEXT NOT NULL,
            avaliacao INTEGER DEFAULT 3,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (token_id) REFERENCES feedback_tokens(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            usado INTEGER DEFAULT 0,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES utilizadores(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS impacto_quadro_logico_historico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            indicador_id INTEGER NOT NULL,
            projeto_id INTEGER NOT NULL,
            valor REAL NOT NULL,
            notas TEXT DEFAULT '',
            registado_por TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (indicador_id) REFERENCES impacto_quadro_logico(id) ON DELETE CASCADE,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS impacto_metricas_historico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metrica_id INTEGER NOT NULL,
            projeto_id INTEGER,
            valor REAL NOT NULL,
            notas TEXT DEFAULT '',
            registado_por TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (metrica_id) REFERENCES impacto_metricas(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS indicador_evidencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            indicador_id INTEGER NOT NULL,
            documento_id INTEGER,
            descricao TEXT DEFAULT '',
            url_externa TEXT DEFAULT '',
            tipo TEXT DEFAULT 'documento',
            criado_por TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (indicador_id) REFERENCES impacto_quadro_logico(id) ON DELETE CASCADE,
            FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS licoes_aprendidas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            area TEXT DEFAULT 'Gestão',
            fase_projeto TEXT DEFAULT 'Execução',
            tipo TEXT DEFAULT 'Positiva',
            impacto TEXT DEFAULT 'Médio',
            recomendacao TEXT DEFAULT '',
            criado_por TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS orcamento_revisoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orcamento_id INTEGER NOT NULL,
            projeto_id INTEGER NOT NULL,
            campo TEXT NOT NULL,
            valor_anterior TEXT,
            valor_novo TEXT,
            alterado_por TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (orcamento_id) REFERENCES orcamento(id) ON DELETE CASCADE,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS procurement (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            descricao TEXT DEFAULT '',
            tipo TEXT DEFAULT 'Serviços',
            valor_estimado REAL DEFAULT 0,
            valor_real REAL DEFAULT 0,
            moeda TEXT DEFAULT 'EUR',
            estado TEXT DEFAULT 'A identificar',
            data_lancamento TEXT DEFAULT '',
            data_adjudicacao TEXT DEFAULT '',
            fornecedor TEXT DEFAULT '',
            numero_referencia TEXT DEFAULT '',
            notas TEXT DEFAULT '',
            criado_por TEXT DEFAULT '',
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_procurement_projeto ON procurement(projeto_id);
    """)

    apply_migrations(conn)

    existing_admin = conn.execute(
        'SELECT COUNT(*) FROM utilizadores WHERE username="admin"'
    ).fetchone()[0]
    if existing_admin == 0:
        admin_password = os.environ.get('ADMIN_PASSWORD')
        if os.environ.get('FLASK_ENV') == 'production' and not admin_password:
            raise RuntimeError('ADMIN_PASSWORD deve estar definida para criar o admin inicial em produção')
        conn.execute(
            'INSERT INTO utilizadores (username, password_hash, nome, papel) VALUES (?, ?, ?, ?)',
            (
                os.environ.get('ADMIN_USERNAME', 'admin'),
                generate_password_hash(admin_password or 'coopgest2025'),
                os.environ.get('ADMIN_NAME', 'Administrador'),
                'admin'
            )
        )
        conn.commit()

    conn.close()

