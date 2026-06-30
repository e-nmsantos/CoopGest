"""
Ponto de entrada WSGI para produção.

Uso com Waitress (Windows):
    pip install waitress
    python wsgi.py

Uso com Gunicorn (Linux/Mac):
    gunicorn wsgi:application --bind 0.0.0.0:8000 --workers 2
"""
from app import app, init_db

# Garantir que a base de dados está inicializada
init_db()

application = app

if __name__ == '__main__':
    import os
    from waitress import serve

    port = int(os.environ.get('PORT', 8000))
    listen = os.environ.get('LISTEN') or f'*:{port}'
    print(f'CoopGest a correr em {listen}', flush=True)
    serve(application, listen=listen, threads=8, url_scheme='https')
