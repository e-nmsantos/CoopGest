"""
Testes para os endpoints de backup/restore do CoopGest.

Endpoints cobertos:
  POST /api/projects/backup/export  — exporta um ou vários projectos para ZIP
  POST /api/projects/backup/import  — restaura a partir de um ZIP
  GET  /api/projects/<id>/export    — exporta um único projecto como JSON

Executar com: pytest tests/test_backups.py -v
"""
import io
import json
import zipfile

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _login(client):
    client.post("/api/auth/login", json={"username": "admin", "password": "coopgest2025"})


def _create_project(client, nome="Backup Proj"):
    r = client.post("/api/projects", json={
        "nome": nome,
        "estado": "Em curso",
        "data_inicio": "2025-01-01",
        "data_fim": "2026-12-31",
    })
    assert r.status_code == 201, f"Falhou a criar projecto: {r.data}"
    return r.get_json()["id"]


def _build_valid_zip(project_payload: dict) -> io.BytesIO:
    """Constrói um ZIP de backup válido com o payload de projecto fornecido."""
    bundle = {
        "manifest": {
            "format": "coopgest-project-backup",
            "version": 1,
            "exported_at": "2025-01-01T00:00:00",
            "exported_by": "admin",
            "project_count": 1,
            "project_ids": [project_payload.get("project", {}).get("id", 99)],
        },
        "projects": [project_payload],
    }
    mem = io.BytesIO()
    with zipfile.ZipFile(mem, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("backup.json", json.dumps(bundle, ensure_ascii=False))
    mem.seek(0)
    return mem


def _minimal_project_payload(nome="Projeto Importado"):
    """Payload mínimo que o serviço de import aceita."""
    return {
        "project": {
            "id": 999,
            "nome": nome,
            "descricao": "Teste de restore",
            "estado": "Planeamento",
            "data_inicio": "2025-01-01",
            "data_fim": "2025-12-31",
            "arquivado": 0,
            "privado": 0,
        },
        "tasks": [],
        "subtasks": [],
        "task_dependencies": [],
        "milestones": [],
        "budget": [],
        "funding": [],
        "comments": [],
        "risks": [],
        "beneficiaries": [],
        "impact_metrics": [],
        "competencies": [],
        "chat_messages": [],
        "hours": [],
        "votings": [],
        "votes": [],
        "templates": [],
        "template_milestones": [],
        "template_tasks": [],
        "template_budget": [],
        "feedback_tokens": [],
        "feedbacks": [],
        "documents": [],
        "partners": [],
        "project_partner_links": [],
        "team_memberships": [],
        "team_skills": [],
    }


# ---------------------------------------------------------------------------
# Testes de exportação — POST /api/projects/backup/export
# ---------------------------------------------------------------------------

class TestBackupExport:
    def test_requer_autenticacao(self, client):
        r = client.post("/api/projects/backup/export", json={"all": True})
        assert r.status_code == 401

    def test_exportar_todos_os_projectos_retorna_zip(self, client):
        _login(client)
        _create_project(client, nome="Proj Export All")
        r = client.post("/api/projects/backup/export", json={"all": True})
        assert r.status_code == 200
        assert r.content_type == "application/zip"
        # O ZIP deve ser válido e conter backup.json
        zf = zipfile.ZipFile(io.BytesIO(r.data))
        assert "backup.json" in zf.namelist()

    def test_exportar_projecto_especifico_por_id(self, client):
        _login(client)
        pid = _create_project(client, nome="Proj Export ID")
        r = client.post("/api/projects/backup/export", json={"project_ids": [pid]})
        assert r.status_code == 200
        assert r.content_type == "application/zip"
        zf = zipfile.ZipFile(io.BytesIO(r.data))
        bundle = json.loads(zf.read("backup.json"))
        assert bundle["manifest"]["project_count"] == 1
        assert bundle["manifest"]["project_ids"] == [pid]
        assert bundle["projects"][0]["project"]["nome"] == "Proj Export ID"

    def test_exportar_sem_projectos_selecionados_retorna_400(self, client):
        _login(client)
        r = client.post("/api/projects/backup/export", json={"project_ids": []})
        assert r.status_code == 400

    def test_exportar_payload_vazio_retorna_400(self, client):
        _login(client)
        r = client.post("/api/projects/backup/export", json={})
        assert r.status_code == 400

    def test_exportar_project_ids_invalido_retorna_400(self, client):
        _login(client)
        r = client.post("/api/projects/backup/export", json={"project_ids": ["nao_e_numero"]})
        assert r.status_code == 400

    def test_bundle_contem_dados_do_projecto(self, client):
        _login(client)
        pid = _create_project(client, nome="Dados Completos")
        # Adicionar uma tarefa para garantir que está no bundle
        client.post(f"/api/projects/{pid}/tasks", json={
            "title": "Tarefa backup",
            "status": "todo",
        })
        r = client.post("/api/projects/backup/export", json={"project_ids": [pid]})
        assert r.status_code == 200
        zf = zipfile.ZipFile(io.BytesIO(r.data))
        bundle = json.loads(zf.read("backup.json"))
        proj_data = bundle["projects"][0]
        assert len(proj_data["tasks"]) >= 1
        assert proj_data["tasks"][0]["nome"] == "Tarefa backup"


# ---------------------------------------------------------------------------
# Testes de restauro — POST /api/projects/backup/import
# ---------------------------------------------------------------------------

class TestBackupImport:
    def test_requer_autenticacao(self, client):
        zip_data = _build_valid_zip(_minimal_project_payload())
        r = client.post(
            "/api/projects/backup/import",
            data={"backup_file": (zip_data, "backup.zip")},
            content_type="multipart/form-data",
        )
        assert r.status_code == 401

    def test_importar_zip_valido_retorna_sucesso(self, client):
        _login(client)
        zip_data = _build_valid_zip(_minimal_project_payload("Importar Sucesso"))
        r = client.post(
            "/api/projects/backup/import",
            data={
                "backup_file": (zip_data, "backup.zip"),
                "strategy": "duplicate",
            },
            content_type="multipart/form-data",
        )
        assert r.status_code == 200
        data = r.get_json()
        assert data["imported_count"] == 1
        assert data["skipped_count"] == 0

    def test_importar_sem_ficheiro_retorna_400(self, client):
        _login(client)
        r = client.post(
            "/api/projects/backup/import",
            data={"strategy": "duplicate"},
            content_type="multipart/form-data",
        )
        assert r.status_code == 400

    def test_importar_zip_invalido_retorna_400(self, client):
        _login(client)
        bad_bytes = io.BytesIO(b"isto nao e um zip")
        r = client.post(
            "/api/projects/backup/import",
            data={"backup_file": (bad_bytes, "backup.zip")},
            content_type="multipart/form-data",
        )
        assert r.status_code == 400

    def test_importar_zip_sem_backup_json_retorna_400(self, client):
        _login(client)
        mem = io.BytesIO()
        with zipfile.ZipFile(mem, mode="w") as zf:
            zf.writestr("outro.txt", "conteudo")
        mem.seek(0)
        r = client.post(
            "/api/projects/backup/import",
            data={"backup_file": (mem, "backup.zip")},
            content_type="multipart/form-data",
        )
        assert r.status_code == 400
        # A mensagem de erro está aninhada em error.message
        body = r.get_json()
        msg = body.get("message") or body.get("error", {}).get("message", "")
        assert "backup.json" in msg

    def test_importar_zip_sem_projectos_retorna_400(self, client):
        _login(client)
        bundle = {"manifest": {}, "projects": []}
        mem = io.BytesIO()
        with zipfile.ZipFile(mem, mode="w") as zf:
            zf.writestr("backup.json", json.dumps(bundle))
        mem.seek(0)
        r = client.post(
            "/api/projects/backup/import",
            data={"backup_file": (mem, "backup.zip")},
            content_type="multipart/form-data",
        )
        assert r.status_code == 400

    def test_importar_com_estrategia_duplicate_cria_novo_projecto(self, client):
        _login(client)
        # Criar projecto original
        pid = _create_project(client, nome="Duplicar Proj")
        # Importar com mesmo nome — deve criar cópia
        zip_data = _build_valid_zip(_minimal_project_payload("Duplicar Proj"))
        r = client.post(
            "/api/projects/backup/import",
            data={
                "backup_file": (zip_data, "backup.zip"),
                "strategy": "duplicate",
            },
            content_type="multipart/form-data",
        )
        assert r.status_code == 200
        data = r.get_json()
        assert data["imported_count"] == 1
        # O projecto importado deve ter um nome diferente (cópia)
        imported_name = data["imported"][0]["project_name"]
        assert "Duplicar Proj" in imported_name

    def test_importar_com_estrategia_skip_nao_duplica(self, client):
        _login(client)
        _create_project(client, nome="Saltar Proj")
        zip_data = _build_valid_zip(_minimal_project_payload("Saltar Proj"))
        r = client.post(
            "/api/projects/backup/import",
            data={
                "backup_file": (zip_data, "backup.zip"),
                "strategy": "skip",
            },
            content_type="multipart/form-data",
        )
        assert r.status_code == 200
        data = r.get_json()
        assert data["imported_count"] == 0
        assert data["skipped_count"] == 1

    def test_dados_do_projecto_sao_preservados_apos_restore(self, client):
        """Exportar um projecto e reimportá-lo deve preservar nome e estado."""
        _login(client)
        pid = _create_project(client, nome="Preserve State")

        # Exportar
        export_r = client.post("/api/projects/backup/export", json={"project_ids": [pid]})
        assert export_r.status_code == 200

        # Importar com estratégia duplicate
        zip_bytes = io.BytesIO(export_r.data)
        import_r = client.post(
            "/api/projects/backup/import",
            data={
                "backup_file": (zip_bytes, "backup.zip"),
                "strategy": "duplicate",
            },
            content_type="multipart/form-data",
        )
        assert import_r.status_code == 200
        import_data = import_r.get_json()
        assert import_data["imported_count"] == 1

        # Verificar que o projecto restaurado existe na listagem
        list_r = client.get("/api/projects")
        assert list_r.status_code == 200
        nomes = [p["nome"] for p in list_r.get_json()]
        assert "Preserve State" in nomes  # original
        # A cópia deve também estar presente com variante do nome
        copies = [n for n in nomes if "Preserve State" in n]
        assert len(copies) >= 2


# ---------------------------------------------------------------------------
# Testes de exportação simples — GET /api/projects/<id>/export
# ---------------------------------------------------------------------------

class TestProjectExport:
    def test_requer_autenticacao(self, client):
        r = client.get("/api/projects/1/export")
        assert r.status_code == 401

    def test_exportar_projecto_existente_retorna_json(self, client):
        _login(client)
        pid = _create_project(client, nome="Export JSON")
        r = client.get(f"/api/projects/{pid}/export")
        assert r.status_code == 200
        assert "application/json" in r.content_type
        data = json.loads(r.data)
        assert data["projeto"]["nome"] == "Export JSON"
        assert "tarefas" in data
        assert "milestones" in data
        assert "riscos" in data

    def test_exportar_projecto_inexistente_retorna_404(self, client):
        _login(client)
        r = client.get("/api/projects/99999/export")
        assert r.status_code == 404
