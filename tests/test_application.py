from coopgest.application import app, create_app
from coopgest.migrations import MIGRATIONS


def test_create_app_returns_configured_flask_app():
    assert create_app() is app


def test_init_db_records_schema_migrations(client):
    import app as app_module

    conn = app_module.get_db()
    try:
        rows = conn.execute("SELECT id FROM schema_migrations ORDER BY id").fetchall()
    finally:
        conn.close()

    assert [row["id"] for row in rows] == [migration[0] for migration in MIGRATIONS]
