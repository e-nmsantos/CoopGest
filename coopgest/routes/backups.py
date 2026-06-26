import io
import json as _json_mod
import os
import uuid
import zipfile
from datetime import datetime

from flask import Blueprint, Response, jsonify, request, send_file, session, current_app
from werkzeug.utils import secure_filename

from coopgest.access import can_access_project
from coopgest.config import ALLOWED_UPLOAD_EXTENSIONS, MAX_BACKUP_FILE_BYTES, MAX_BACKUP_TOTAL_BYTES, UPLOAD_FOLDER
from coopgest.db import get_db, row_to_dict
from coopgest.http_helpers import api_error, login_required
from coopgest.services.backups import fetch_project_backup_payload, import_project_payload


bp = Blueprint("backups", __name__)


def _extension(filename):
    return filename.rsplit('.', 1)[-1].lower() if filename and '.' in filename else ''


def _is_allowed_upload(filename):
    return _extension(filename) in ALLOWED_UPLOAD_EXTENSIONS


@bp.route('/api/projects/backup/export', methods=['POST'])
@login_required
def api_projects_backup_export():
    payload = request.get_json(silent=True) or {}
    include_all = bool(payload.get('all'))
    raw_ids = payload.get('project_ids') or []

    conn = get_db()
    try:
        if include_all:
            project_ids = [int(r['id']) for r in conn.execute('SELECT id FROM projetos ORDER BY id').fetchall()]
        else:
            try:
                project_ids = sorted({int(pid) for pid in raw_ids})
            except Exception:
                return api_error('project_ids inválido', 400, 'VALIDATION_ERROR')

        if not project_ids:
            return api_error('Selecione pelo menos um projeto para backup', 400, 'VALIDATION_ERROR')

        projects = []
        files_to_pack = set()
        for pid in project_ids:
            if not can_access_project(conn, pid):
                continue
            payload = fetch_project_backup_payload(conn, pid)
            if not payload:
                continue
            projects.append(payload)
            for doc in payload.get('documents', []):
                fname = os.path.basename(str(doc.get('nome_ficheiro', '')))
                if fname:
                    files_to_pack.add(fname)

        if not projects:
            return api_error('Nenhum projeto acessível para exportar', 403, 'FORBIDDEN')

        bundle = {
            'manifest': {
                'format': 'coopgest-project-backup',
                'version': 1,
                'exported_at': datetime.now().isoformat(timespec='seconds'),
                'exported_by': session.get('username', 'desconhecido'),
                'project_count': len(projects),
                'project_ids': [p.get('project', {}).get('id') for p in projects],
            },
            'projects': projects,
        }

        mem = io.BytesIO()
        with zipfile.ZipFile(mem, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('backup.json', _json_mod.dumps(bundle, ensure_ascii=False, indent=2))
            for fname in files_to_pack:
                path = os.path.join(UPLOAD_FOLDER, fname)
                if os.path.exists(path):
                    zf.write(path, arcname=f'files/{fname}')

        mem.seek(0)
        stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        return send_file(mem, mimetype='application/zip', as_attachment=True, download_name=f'backup-projetos-{stamp}.zip')
    finally:
        conn.close()


@bp.route('/api/projects/backup/import', methods=['POST'])
@login_required
def api_projects_backup_import():
    strategy = (request.form.get('strategy') or 'duplicate').strip().lower()
    if strategy not in {'duplicate', 'replace', 'skip'}:
        strategy = 'duplicate'

    uploaded = request.files.get('backup_file')
    if not uploaded:
        return api_error('Ficheiro de backup em falta', 400, 'VALIDATION_ERROR')

    try:
        with zipfile.ZipFile(uploaded.stream) as zf:
            if 'backup.json' not in zf.namelist():
                return api_error('Backup inválido: backup.json em falta', 400, 'VALIDATION_ERROR')
            total_size = sum(info.file_size for info in zf.infolist())
            if total_size > MAX_BACKUP_TOTAL_BYTES:
                return api_error('Backup demasiado grande', 400, 'VALIDATION_ERROR')
            for info in zf.infolist():
                parts = info.filename.replace('\\', '/').split('/')
                if info.file_size > MAX_BACKUP_FILE_BYTES or info.filename.startswith('/') or '..' in parts:
                    return api_error('Backup contém ficheiros inválidos', 400, 'VALIDATION_ERROR')
            bundle = _json_mod.loads(zf.read('backup.json').decode('utf-8'))
            projects = bundle.get('projects') or []
            if not isinstance(projects, list) or not projects:
                return api_error('Backup sem projetos válidos', 400, 'VALIDATION_ERROR')

            conn = get_db()
            imported = []
            skipped = []
            warnings = []
            try:
                for project_payload in projects:
                    summary = import_project_payload(conn, project_payload, strategy=strategy)
                    if summary.get('status') == 'skipped':
                        skipped.append(summary)
                        continue

                    new_project_id = summary.get('new_project_id')
                    for doc in project_payload.get('documents', []):
                        zip_path = doc.get('zip_path')
                        if zip_path:
                            norm_zip_path = str(zip_path).replace('\\', '/')
                            if not norm_zip_path.startswith('files/') or '..' in norm_zip_path.split('/'):
                                warnings.append(f"Documento ignorado por caminho inválido: {doc.get('nome') or zip_path}")
                                continue
                        if not zip_path or zip_path not in zf.namelist():
                            if doc.get('nome_ficheiro'):
                                warnings.append(f"Documento em falta no ZIP: {doc.get('nome') or doc.get('nome_ficheiro')}")
                            continue

                        original_name = os.path.basename(str(doc.get('nome_ficheiro', '')))
                        safe_name = secure_filename(original_name) or f'{uuid.uuid4().hex}.bin'
                        if not _is_allowed_upload(safe_name):
                            warnings.append(f"Documento ignorado por tipo não permitido: {doc.get('nome') or original_name}")
                            continue
                        final_name = safe_name
                        base, ext = os.path.splitext(safe_name)
                        while os.path.exists(os.path.join(UPLOAD_FOLDER, final_name)):
                            final_name = f'{base}-{uuid.uuid4().hex[:8]}{ext}'

                        with zf.open(zip_path, 'r') as src, open(os.path.join(UPLOAD_FOLDER, final_name), 'wb') as dst:
                            while True:
                                chunk = src.read(1024 * 1024)
                                if not chunk:
                                    break
                                dst.write(chunk)

                        conn.execute(
                            '''INSERT INTO documentos (nome, nome_ficheiro, tipo, categoria, tamanho, uploader, projeto_id, criado_em)
                               VALUES (?,?,?,?,?,?,?,?)''',
                            (
                                doc.get('nome', original_name),
                                final_name,
                                doc.get('tipo', 'application/octet-stream'),
                                doc.get('categoria', 'Outros'),
                                int(doc.get('tamanho', 0) or 0),
                                doc.get('uploader', session.get('username', 'sistema')),
                                new_project_id,
                                doc.get('criado_em') or datetime.now().isoformat(timespec='seconds'),
                            ),
                        )

                    imported.append(summary)

                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

            return jsonify({
                'message': 'Restore concluído',
                'strategy': strategy,
                'imported_count': len(imported),
                'skipped_count': len(skipped),
                'imported': imported,
                'skipped': skipped,
                'warnings': warnings,
            })
    except zipfile.BadZipFile:
        return api_error('Ficheiro ZIP inválido', 400, 'VALIDATION_ERROR')
    except Exception as e:
        current_app.logger.exception('Erro ao importar backup: %s', e)
        return api_error('Erro ao importar backup', 500, 'INTERNAL_ERROR')


@bp.route('/api/projects/<int:id>/export', methods=['GET'])
@login_required
def api_project_export(id):
    conn = get_db()
    proj = conn.execute('SELECT * FROM projetos WHERE id=?', (id,)).fetchone()
    if not proj:
        conn.close()
        return api_error('Projeto não encontrado', 404, 'NOT_FOUND')
    data = {
        'projeto': row_to_dict(proj),
        'tarefas': [row_to_dict(r) for r in conn.execute('SELECT * FROM tarefas WHERE projeto_id=?', (id,)).fetchall()],
        'milestones': [row_to_dict(r) for r in conn.execute('SELECT * FROM milestones WHERE projeto_id=?', (id,)).fetchall()],
        'orcamento': [row_to_dict(r) for r in conn.execute('SELECT * FROM orcamento WHERE projeto_id=?', (id,)).fetchall()],
        'parceiros': [row_to_dict(r) for r in conn.execute(
            'SELECT p.* FROM parceiros p JOIN projeto_parceiro pp ON pp.parceiro_id=p.id WHERE pp.projeto_id=?', (id,)
        ).fetchall()],
        'comentarios': [row_to_dict(r) for r in conn.execute('SELECT * FROM comentarios WHERE projeto_id=? AND (tarefa_id IS NULL OR tarefa_id=0)', (id,)).fetchall()],
        'riscos': [row_to_dict(r) for r in conn.execute('SELECT * FROM riscos WHERE projeto_id=?', (id,)).fetchall()],
        'beneficiarios': [row_to_dict(r) for r in conn.execute('SELECT * FROM beneficiarios WHERE projeto_id=?', (id,)).fetchall()],
        'funding': [row_to_dict(r) for r in conn.execute('SELECT * FROM fontes_financiamento WHERE projeto_id=?', (id,)).fetchall()],
        'equipa': [row_to_dict(r) for r in conn.execute(
            'SELECT pm.*, u.nome, u.username FROM projeto_membros pm JOIN utilizadores u ON pm.user_id=u.id WHERE pm.projeto_id=?', (id,)
        ).fetchall()],
        'exported_at': datetime.now().isoformat(),
    }
    conn.close()
    return Response(
        _json_mod.dumps(data, ensure_ascii=False, indent=2),
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment; filename="projeto-{id}.json"'}
    )



