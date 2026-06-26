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
