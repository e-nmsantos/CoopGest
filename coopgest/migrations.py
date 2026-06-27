from __future__ import annotations

import sqlite3
from collections.abc import Iterable


Migration = tuple[str, tuple[str, ...]]


MIGRATIONS: tuple[Migration, ...] = (
    (
        "202606260001_legacy_columns",
        (
            'ALTER TABLE parceiros ADD COLUMN pais TEXT DEFAULT "Portugal"',
            'ALTER TABLE parceiros ADD COLUMN descricao TEXT DEFAULT ""',
            'ALTER TABLE parceiros ADD COLUMN papel TEXT DEFAULT ""',
            'ALTER TABLE tarefas ADD COLUMN tags TEXT DEFAULT ""',
            'ALTER TABLE tarefas ADD COLUMN criado_em TEXT DEFAULT ""',
            'ALTER TABLE projetos ADD COLUMN arquivado INTEGER DEFAULT 0',
            'ALTER TABLE comentarios ADD COLUMN tarefa_id INTEGER DEFAULT NULL',
            'ALTER TABLE tarefas ADD COLUMN recorrencia TEXT DEFAULT NULL',
            'ALTER TABLE notificacoes ADD COLUMN lida INTEGER DEFAULT 0',
            'ALTER TABLE notificacoes ADD COLUMN url TEXT DEFAULT NULL',
            'ALTER TABLE projetos ADD COLUMN privado INTEGER DEFAULT 0',
            'ALTER TABLE votacoes ADD COLUMN projeto_id INTEGER DEFAULT NULL',
            'ALTER TABLE impacto_metricas ADD COLUMN projeto_id INTEGER DEFAULT NULL',
            'ALTER TABLE documentos ADD COLUMN projeto_id INTEGER DEFAULT NULL',
            'ALTER TABLE competencias ADD COLUMN projeto_id INTEGER DEFAULT NULL',
            'ALTER TABLE templates ADD COLUMN projeto_id INTEGER DEFAULT NULL',
            'ALTER TABLE auditoria ADD COLUMN projeto_id INTEGER DEFAULT NULL',
            'ALTER TABLE movimentos_financeiros ADD COLUMN entidade TEXT DEFAULT ""',
            'ALTER TABLE movimentos_financeiros ADD COLUMN referencia TEXT DEFAULT ""',
            'ALTER TABLE movimentos_financeiros ADD COLUMN estado TEXT DEFAULT "Confirmado"',
            'ALTER TABLE movimentos_financeiros ADD COLUMN notas TEXT DEFAULT ""',
            'ALTER TABLE movimentos_financeiros ADD COLUMN anexo_nome TEXT DEFAULT ""',
            'ALTER TABLE movimentos_financeiros ADD COLUMN anexo_ficheiro TEXT DEFAULT ""',
            'ALTER TABLE movimentos_financeiros ADD COLUMN anexo_tipo TEXT DEFAULT ""',
            'ALTER TABLE movimentos_financeiros ADD COLUMN anexo_tamanho INTEGER DEFAULT 0',
            'ALTER TABLE movimentos_financeiros ADD COLUMN criado_por TEXT DEFAULT ""',
            'ALTER TABLE movimentos_financeiros ADD COLUMN atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP',
        ),
    ),
    (
        "202606260002_performance_indexes",
        (
            "CREATE INDEX IF NOT EXISTS idx_tarefas_projeto_id ON tarefas(projeto_id)",
            "CREATE INDEX IF NOT EXISTS idx_tarefas_estado ON tarefas(estado)",
            "CREATE INDEX IF NOT EXISTS idx_movimentos_projeto_id ON movimentos_financeiros(projeto_id)",
            "CREATE INDEX IF NOT EXISTS idx_utilizadores_username ON utilizadores(username)",
            "CREATE INDEX IF NOT EXISTS idx_projeto_membros_user ON projeto_membros(user_id)",
        ),
    ),
    (
        "202606260003_me_excellence",
        (
            # LFA: level (Impact/Outcome/Output/Activity) + measurement fields
            'ALTER TABLE impacto_quadro_logico ADD COLUMN nivel TEXT DEFAULT "Resultado"',
            'ALTER TABLE impacto_quadro_logico ADD COLUMN unidade TEXT DEFAULT ""',
            'ALTER TABLE impacto_quadro_logico ADD COLUMN frequencia_medicao TEXT DEFAULT "Trimestral"',
            'ALTER TABLE impacto_quadro_logico ADD COLUMN responsavel_medicao TEXT DEFAULT ""',
            # Risk management: owner, next review, contingency plan
            'ALTER TABLE riscos ADD COLUMN dono TEXT DEFAULT ""',
            'ALTER TABLE riscos ADD COLUMN proxima_revisao TEXT DEFAULT ""',
            'ALTER TABLE riscos ADD COLUMN plano_contingencia TEXT DEFAULT ""',
            # Multi-currency for financial movements and funding sources
            'ALTER TABLE movimentos_financeiros ADD COLUMN moeda TEXT DEFAULT "EUR"',
            'ALTER TABLE movimentos_financeiros ADD COLUMN taxa_cambio REAL DEFAULT 1.0',
            'ALTER TABLE fontes_financiamento ADD COLUMN moeda TEXT DEFAULT "EUR"',
            # Beneficiaries: archival flag and geographic field
            'ALTER TABLE beneficiarios ADD COLUMN localizacao TEXT DEFAULT ""',
            'ALTER TABLE beneficiarios ADD COLUMN arquivado INTEGER DEFAULT 0',
            # Logframe history: one row per measurement recorded
            """CREATE TABLE IF NOT EXISTS impacto_quadro_logico_historico (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                indicador_id INTEGER NOT NULL,
                projeto_id INTEGER NOT NULL,
                valor REAL NOT NULL,
                notas TEXT DEFAULT '',
                registado_por TEXT DEFAULT '',
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (indicador_id) REFERENCES impacto_quadro_logico(id) ON DELETE CASCADE,
                FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
            )""",
            # Impact metric history
            """CREATE TABLE IF NOT EXISTS impacto_metricas_historico (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metrica_id INTEGER NOT NULL,
                projeto_id INTEGER,
                valor REAL NOT NULL,
                notas TEXT DEFAULT '',
                registado_por TEXT DEFAULT '',
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (metrica_id) REFERENCES impacto_metricas(id) ON DELETE CASCADE
            )""",
            # Beneficiary disaggregation (gender, age, location, vulnerability)
            """CREATE TABLE IF NOT EXISTS beneficiarios_desagregacao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                beneficiario_id INTEGER NOT NULL,
                projeto_id INTEGER NOT NULL,
                dimensao TEXT NOT NULL,
                categoria TEXT NOT NULL,
                numero INTEGER DEFAULT 0,
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (beneficiario_id) REFERENCES beneficiarios(id) ON DELETE CASCADE,
                FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
            )""",
            # Evidence linked to logframe indicators
            """CREATE TABLE IF NOT EXISTS indicador_evidencias (
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
            )""",
            # Budget revision history
            """CREATE TABLE IF NOT EXISTS orcamento_revisoes (
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
            )""",
            # Performance indexes for new tables
            "CREATE INDEX IF NOT EXISTS idx_logframe_historico_indicador ON impacto_quadro_logico_historico(indicador_id)",
            "CREATE INDEX IF NOT EXISTS idx_metricas_historico_metrica ON impacto_metricas_historico(metrica_id)",
            "CREATE INDEX IF NOT EXISTS idx_desagregacao_beneficiario ON beneficiarios_desagregacao(beneficiario_id)",
            "CREATE INDEX IF NOT EXISTS idx_desagregacao_projeto ON beneficiarios_desagregacao(projeto_id)",
            "CREATE INDEX IF NOT EXISTS idx_evidencias_indicador ON indicador_evidencias(indicador_id)",
        ),
    ),
    (
        "202606260004_pressupostos_licoes",
        (
            # Assumptions column on logical framework indicators (5th LFA column)
            'ALTER TABLE impacto_quadro_logico ADD COLUMN pressupostos TEXT DEFAULT ""',
            # Lessons learned table
            """CREATE TABLE IF NOT EXISTS licoes_aprendidas (
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
            )""",
            "CREATE INDEX IF NOT EXISTS idx_licoes_projeto ON licoes_aprendidas(projeto_id)",
        ),
    ),
    (
        "202606260005_procurement",
        (
            """CREATE TABLE IF NOT EXISTS procurement (
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
            )""",
            "CREATE INDEX IF NOT EXISTS idx_procurement_projeto ON procurement(projeto_id)",
        ),
    ),
    (
        "202606270006_stakeholders",
        (
            """CREATE TABLE IF NOT EXISTS stakeholders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                projeto_id INTEGER NOT NULL,
                nome TEXT NOT NULL,
                organizacao TEXT DEFAULT '',
                papel TEXT DEFAULT '',
                interesse TEXT DEFAULT 'Médio',
                influencia TEXT DEFAULT 'Médio',
                posicao TEXT DEFAULT 'Neutro',
                estrategia TEXT DEFAULT '',
                contacto TEXT DEFAULT '',
                notas TEXT DEFAULT '',
                criado_por TEXT DEFAULT '',
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
            )""",
            "CREATE INDEX IF NOT EXISTS idx_stakeholders_projeto ON stakeholders(projeto_id)",
        ),
    ),
    (
        "202606270001_projetos_atualizado_em",
        (
            'ALTER TABLE projetos ADD COLUMN atualizado_em TEXT DEFAULT NULL',
        ),
    ),
    (
        "202606270002_backup_restore_columns",
        (
            'ALTER TABLE milestones ADD COLUMN criado_em TEXT DEFAULT NULL',
            'ALTER TABLE orcamento ADD COLUMN criado_em TEXT DEFAULT NULL',
        ),
    ),
    (
        "202606270003_projeto_parceiro_criado_em",
        (
            'ALTER TABLE projeto_parceiro ADD COLUMN criado_em TEXT DEFAULT NULL',
        ),
    ),
)


def apply_migrations(conn: sqlite3.Connection, migrations: Iterable[Migration] = MIGRATIONS) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id TEXT PRIMARY KEY,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    applied = {
        row["id"]
        for row in conn.execute("SELECT id FROM schema_migrations").fetchall()
    }

    for migration_id, statements in migrations:
        if migration_id in applied:
            continue
        for sql in statements:
            try:
                conn.execute(sql)
            except sqlite3.OperationalError as exc:
                if not _is_duplicate_column_error(exc):
                    raise
        conn.execute("INSERT INTO schema_migrations (id) VALUES (?)", (migration_id,))
        conn.commit()


def _is_duplicate_column_error(exc: sqlite3.OperationalError) -> bool:
    return "duplicate column name" in str(exc).lower()
