"""Reset admin password and clean up E2E test data before each test run."""
import sqlite3
import os
import sys

db_path = os.environ.get("DB_PATH", "projetos.db")

if not os.path.exists(db_path):
    print(f"E2E setup: {db_path} nao encontrado — backend cria na primeira execucao")
    sys.exit(0)

try:
    from werkzeug.security import generate_password_hash
except ImportError:
    print("E2E setup: werkzeug nao instalado, a saltar reset de password")
    sys.exit(0)

conn = sqlite3.connect(db_path)
conn.execute("PRAGMA foreign_keys = ON")
try:
    # 1. Reset admin password
    pwd_hash = generate_password_hash("coopgest2025")
    row = conn.execute(
        "SELECT id FROM utilizadores WHERE username = 'admin'"
    ).fetchone()
    if row:
        conn.execute(
            "UPDATE utilizadores SET password_hash = ? WHERE username = 'admin'",
            (pwd_hash,),
        )
        conn.commit()
        print("E2E setup: password do admin reposta para coopgest2025")
    else:
        print("E2E setup: utilizador admin nao encontrado — backend criara com credenciais padrao")

    # 2. Apagar projectos criados por testes E2E anteriores
    # Padroes de nomes usados nos testes: "E2E", "Fluxo", "Projeto E2E", etc.
    test_patterns = [
        "Projeto E2E%",
        "Fluxo%",
        "E2E Export%",
        "E2E JSON%",
        "E2E Test%",
        "Projeto de Teste%",
        "Test Project%",
    ]
    total_deleted = 0
    for pattern in test_patterns:
        rows = conn.execute(
            "SELECT id FROM projetos WHERE nome LIKE ?", (pattern,)
        ).fetchall()
        for row in rows:
            conn.execute("DELETE FROM projetos WHERE id = ?", (row[0],))
            total_deleted += 1
    if total_deleted:
        conn.commit()
        print(f"E2E setup: {total_deleted} projecto(s) de teste eliminado(s)")
    else:
        print("E2E setup: sem projectos de teste para limpar")

except Exception as exc:
    print(f"E2E setup error: {exc}", file=sys.stderr)
    sys.exit(1)
finally:
    conn.close()
