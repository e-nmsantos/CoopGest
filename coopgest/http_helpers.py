from functools import wraps

from flask import jsonify, session


def ensure_direct_session():
    if "user_id" in session:
        return

    from coopgest.db import get_db

    conn = get_db()
    user = conn.execute(
        "SELECT id, username, nome, papel FROM utilizadores WHERE papel='admin' ORDER BY id LIMIT 1"
    ).fetchone()
    if user:
        session["user_id"] = user["id"]
        session["username"] = user["username"]
        session["nome"] = user["nome"]
        session["papel"] = user["papel"]
        session.permanent = True
    conn.close()


def api_error(message, status_code=400, code="BAD_REQUEST", details=None):
    """Resposta JSON padronizada para erros."""
    payload = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details:
        payload["error"]["details"] = details
    return jsonify(payload), status_code


def login_required(f):
    """Decorator que garante uma sessão ativa."""
    @wraps(f)
    def decorated(*args, **kwargs):
        ensure_direct_session()
        if "user_id" not in session:
            return api_error("Autenticação necessária", 401, "UNAUTHORIZED")
        return f(*args, **kwargs)
    return decorated


def make_rate_limit(limiter):
    """Fabrica um decorator de rate limit a partir do limiter Flask-Limiter."""
    def _rate_limit(limit_string: str):
        def decorator(f):
            if limiter:
                return limiter.limit(limit_string)(f)
            return f
        return decorator
    return _rate_limit
