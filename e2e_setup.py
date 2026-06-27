"""Reset admin password to known value before E2E tests."""
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
try:
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
except Exception as exc:
    print(f"E2E setup error: {exc}", file=sys.stderr)
    sys.exit(1)
finally:
    conn.close()
