from flask import Flask, request
import os
import sys
from datetime import timedelta
from urllib.parse import urlparse
from werkzeug.security import generate_password_hash

from coopgest.db import get_db
from coopgest.http_helpers import api_error, make_rate_limit
from coopgest.services.email import configure_email_service
from coopgest.services.reports import build_project_executive_report

# Carregar variáveis de ambiente de .env (se existir)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from flask_mail import Mail, Message as MailMessage
    _mail_available = True
except ImportError:
    _mail_available = False

try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    _limiter_available = True
except ImportError:
    _limiter_available = False

PACKAGE_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.dirname(PACKAGE_DIR)

app = Flask(__name__, template_folder=os.path.join(PROJECT_ROOT, "templates"))
_is_production = os.environ.get('FLASK_ENV', 'development') == 'production'
_secret_key = os.environ.get('SECRET_KEY')
if _is_production and not _secret_key:
    raise RuntimeError('SECRET_KEY deve estar definida em produção')
app.secret_key = _secret_key or 'cooperacao_secret_key_dev_only'

# --- Segurança de sessão ------------------------------------------------------
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = _is_production
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 25 * 1024 * 1024))

# --- Rate limiting ------------------------------------------------------------
if _limiter_available:
    _limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=[],
        storage_uri='memory://',
    )
else:
    _limiter = None

# --- Rate limit helper -------------------------------------------------------
_rate_limit = make_rate_limit(_limiter)

# Email configuration via environment variables.
app.config['MAIL_SERVER']   = os.environ.get('MAIL_SERVER', '')
app.config['MAIL_PORT']     = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS']  = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', '')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', '')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_SENDER', '')

mail = Mail(app) if _mail_available else None
configure_email_service(app, mail, MailMessage if _mail_available else None, _mail_available)

RESOURCE_DIR = getattr(sys, '_MEIPASS', PROJECT_ROOT)
app.config['DIST_FOLDER'] = os.path.join(RESOURCE_DIR, 'dist')


def create_app():
    """Return the configured CoopGest Flask application."""
    return app


from coopgest.routes import register_blueprints

register_blueprints(app)

@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


@app.before_request
def block_legacy_routes():
    if request.path.startswith('/legacy') and os.environ.get('ENABLE_LEGACY_ROUTES') != '1':
        return api_error('Rotas legacy desativadas', 404, 'NOT_FOUND')

    if request.path.startswith('/api/') and request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
        origin = request.headers.get('Origin')
        if origin:
            origin_host = urlparse(origin).netloc
            if origin_host and origin_host != request.host:
                return api_error('Origem não permitida', 403, 'FORBIDDEN')


def _is_dev_token_response_enabled():
    return app.config.get('TESTING') or (
        not _is_production and os.environ.get('ALLOW_DEV_RESET_TOKEN') == '1'
    )


# --- Handlers de erro globais (garantem JSON em vez de HTML) -----------------
@app.errorhandler(400)
def handle_400(e): return api_error(str(e), 400, 'BAD_REQUEST')

@app.errorhandler(404)
def handle_404(e): return api_error('Recurso não encontrado', 404, 'NOT_FOUND')

@app.errorhandler(405)
def handle_405(e): return api_error('Método não permitido', 405, 'METHOD_NOT_ALLOWED')

@app.errorhandler(429)
def handle_429(e): return api_error('Demasiadas tentativas. Aguarde um momento.', 429, 'RATE_LIMITED')

@app.errorhandler(500)
def handle_500(e):
    app.logger.error('Internal error: %s', e)
    return api_error('Erro interno do servidor', 500, 'INTERNAL_ERROR')


def init_db():
    from coopgest.db import init_db as _init_db
    _init_db()


if __name__ == '__main__':
    init_db()
    app.run(debug=os.environ.get('FLASK_DEBUG', 'False') == 'True', threaded=True)


