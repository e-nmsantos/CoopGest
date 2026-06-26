# CoopGest

CoopGest e uma aplicacao de gestao de projetos cooperativos, com foco em trabalho colaborativo, planeamento, financas, impacto, documentos, parceiros, equipa, auditoria, feedback e relatorios executivos.

## Estado

A aplicacao combina:

- Backend Flask modular em `coopgest/`
- Frontend React/Vite em `src/`
- Base de dados SQLite local
- Uploads locais
- Build web servido pelo Flask em producao/local desktop

## Requisitos

- Python 3.13
- Node.js com npm

## Configuracao

1. Copiar `.env.example` para `.env`.
2. Definir `SECRET_KEY`.
3. Em producao, definir tambem `ADMIN_PASSWORD`.
4. Opcionalmente configurar SMTP para envio real de emails.

Variaveis principais:

- `SECRET_KEY`: chave secreta Flask.
- `FLASK_ENV`: `development` ou `production`.
- `DB_PATH`: caminho opcional para a base de dados SQLite.
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME`: dados do admin inicial.
- `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SENDER`: configuracao de email.
- `MAX_CONTENT_LENGTH`, `MAX_BACKUP_FILE_BYTES`, `MAX_BACKUP_TOTAL_BYTES`: limites de upload/backup.
- `ENABLE_LEGACY_ROUTES=1`: ativa rotas HTML antigas em `/legacy`.

## Instalar

```powershell
py -3.13 -m pip install -r requirements.txt
npm install
```

## Desenvolvimento

Terminal 1, backend:

```powershell
py -3.13 app.py
```

Terminal 2, frontend:

```powershell
npm run dev
```

O Vite encaminha `/api` para `http://127.0.0.1:5000`.

## Build

```powershell
npm run build
```

O build fica em `dist/` e e servido pelo Flask.

## Testes

```powershell
py -3.13 -m pytest -q
npm run build
npm audit --audit-level=high
```

## Estrutura

- `coopgest/application.py`: configuracao Flask, seguranca, handlers e registo de blueprints.
- `coopgest/routes/`: rotas por dominio.
- `coopgest/services/`: logica reutilizavel de dominio.
- `coopgest/db.py`: schema e inicializacao da base de dados.
- `src/app/`: aplicacao React.
- `tests/`: testes automatizados do backend.

## Credenciais iniciais

Em desenvolvimento, se nao existir utilizador admin:

- Username: `admin`
- Password: `coopgest2025`

Em producao, defina obrigatoriamente `ADMIN_PASSWORD`.
