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

    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 8000))
    print(f'CoopGest a correr em http://{host}:{port}')
    serve(application, host=host, port=port, threads=8)
