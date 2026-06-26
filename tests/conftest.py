import gc
import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("FLASK_ENV", "development")

# Ensure DB_PATH is set before importing app
from coopgest.config import DB_PATH as _DB_PATH


@pytest.fixture
def client():
    from app import app as flask_app

    flask_app.config["TESTING"] = True
    flask_app.config["RATELIMIT_ENABLED"] = False
    flask_app.config["WTF_CSRF_ENABLED"] = False
    if getattr(flask_app, "_limiter", None):
        flask_app._limiter.reset()

    fd, db_path = tempfile.mkstemp(suffix=".db")
    flask_app.DB_PATH = db_path
    import coopgest.config
    coopgest.config.DB_PATH = db_path

    with flask_app.app_context():
        from app import init_db
        init_db()
    yield flask_app.test_client()

    gc.collect()
    os.close(fd)
    try:
        os.unlink(db_path)
    except PermissionError:
        pass


def login(client, username="admin", password="coopgest2025"):
    return client.post("/api/auth/login", json={"username": username, "password": password})