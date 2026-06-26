"""
Testes para relatórios executivos.
"""
import pytest


class TestBuildProjectExecutiveReport:
    def test_projeto_sem_dados_tem_score_atencao(self, client):
        from app import get_db, build_project_executive_report
        client.post("/api/auth/login", json={"username": "admin", "password": "coopgest2025"})
        r = client.post("/api/projects", json={
            "nome": "Teste Sem Dados",
            "estado": "Em curso",
            "data_inicio": "2025-01-01",
            "data_fim": "2025-12-31",
        })
        pid = r.get_json()["id"]
        with client.application.app_context():
            report = build_project_executive_report(get_db(), pid)
        assert report is not None
        assert report["health"]["status"] == "Atenção"
        assert report["summary"]["tarefas_total"] == 0

    def test_sugere_criar_plano_trabalho_quando_sem_tarefas(self, client):
        from app import get_db, build_project_executive_report
        client.post("/api/auth/login", json={"username": "admin", "password": "coopgest2025"})
        r = client.post("/api/projects", json={
            "nome": "Sem Tarefas",
            "estado": "Em curso",
            "data_inicio": "2025-01-01",
            "data_fim": "2025-12-31",
        })
        pid = r.get_json()["id"]
        with client.application.app_context():
            report = build_project_executive_report(get_db(), pid)
        kinds = [rec["kind"] for rec in report["recommendations"]]
        assert "planeamento" in kinds