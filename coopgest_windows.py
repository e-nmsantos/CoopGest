import os
import threading
import webbrowser

from waitress import serve

from app import app, init_db


def open_browser(port):
    webbrowser.open(f'http://127.0.0.1:{port}', new=2)


def main():
    os.environ.setdefault('FLASK_ENV', 'development')
    os.environ.setdefault('HOST', '127.0.0.1')
    os.environ.setdefault('PORT', '8000')

    host = os.environ['HOST']
    port = int(os.environ['PORT'])

    init_db()

    print('')
    print('========================================================')
    print('  CoopGest - Gestao de Projetos Cooperativos')
    print('========================================================')
    print('')
    print(f'A abrir em http://127.0.0.1:{port}')
    print('Utilizador inicial: admin')
    print('Password inicial:   coopgest2025')
    print('')
    print('Mantenha esta janela aberta enquanto estiver a usar a app.')
    print('Para encerrar, feche esta janela ou use Ctrl+C.')
    print('')

    if os.environ.get('COOPGEST_OPEN_BROWSER', '1') != '0':
        threading.Timer(1.5, open_browser, args=(port,)).start()
    serve(app, host=host, port=port, threads=4)


if __name__ == '__main__':
    main()
