"""
Testes para fase 3: Excel export, donor reports, procurement, portfolio dashboard.
Executar com: pytest tests/test_phase3.py -v
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("FLASK_ENV", "development")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _login(client):
    client.post("/api/auth/login", json={"username": "admin", "password": "coopgest2025"})


def _project(client, nome="Proj Fase3"):
    r = client.post("/api/projects", json={
        "nome": nome, "estado": "Em curso",
        "data_inicio": "2025-01-01", "data_fim": "2026-12-31",
    })
    assert r.status_code == 201
    return r.get_json()["id"]


# ── Procurement ───────────────────────────────────────────────────────────────

class TestProcurement:
    def test_meta_endpoint(self, client):
        _login(client)
        pid = _project(client)
        r = client.get(f"/api/projects/{pid}/procurement/meta")
        assert r.status_code == 200
        d = r.get_json()
        assert "tipos" in d and "estados" in d
        assert "Bens" in d["tipos"]
        assert "Adjudicado" in d["estados"]

    def test_criar_contrato(self, client):
        _login(client)
        pid = _project(client)
        r = client.post(f"/api/projects/{pid}/procurement", json={
            "titulo": "Aquisição de equipamentos",
            "tipo": "Bens",
            "valor_estimado": 15000,
            "estado": "Em preparação",
        })
        assert r.status_code == 201
        d = r.get_json()
        assert d["titulo"] == "Aquisição de equipamentos"
        assert d["tipo"] == "Bens"
        assert d["valor_estimado"] == 15000.0

    def test_titulo_obrigatorio(self, client):
        _login(client)
        pid = _project(client)
        r = client.post(f"/api/projects/{pid}/procurement", json={"tipo": "Bens"})
        assert r.status_code == 400

    def test_tipo_invalido_falha(self, client):
        _login(client)
        pid = _project(client)
        r = client.post(f"/api/projects/{pid}/procurement", json={
            "titulo": "X", "tipo": "Inventado",
        })
        assert r.status_code == 400

    def test_estado_invalido_falha(self, client):
        _login(client)
        pid = _project(client)
        r = client.post(f"/api/projects/{pid}/procurement", json={
            "titulo": "X", "tipo": "Bens", "estado": "Inventado",
        })
        assert r.status_code == 400

    def test_listar_contratos(self, client):
        _login(client)
        pid = _project(client)
        client.post(f"/api/projects/{pid}/procurement", json={"titulo": "C1", "tipo": "Serviços"})
        client.post(f"/api/projects/{pid}/procurement", json={"titulo": "C2", "tipo": "Obras"})
        r = client.get(f"/api/projects/{pid}/procurement")
        assert r.status_code == 200
        assert len(r.get_json()) == 2

    def test_filtrar_por_estado(self, client):
        _login(client)
        pid = _project(client)
        client.post(f"/api/projects/{pid}/procurement", json={
            "titulo": "C1", "tipo": "Bens", "estado": "Adjudicado",
        })
        client.post(f"/api/projects/{pid}/procurement", json={
            "titulo": "C2", "tipo": "Serviços", "estado": "Em preparação",
        })
        r = client.get(f"/api/projects/{pid}/procurement?estado=Adjudicado")
        assert r.status_code == 200
        items = r.get_json()
        assert len(items) == 1
        assert items[0]["estado"] == "Adjudicado"

    def test_atualizar_contrato(self, client):
        _login(client)
        pid = _project(client)
        cr = client.post(f"/api/projects/{pid}/procurement", json={
            "titulo": "Original", "tipo": "Bens",
        })
        cid = cr.get_json()["id"]
        r = client.put(f"/api/projects/{pid}/procurement/{cid}", json={
            "fornecedor": "Empresa ABC Lda",
            "valor_real": 14500,
            "estado": "Adjudicado",
            "data_adjudicacao": "2026-03-15",
        })
        assert r.status_code == 200
        d = r.get_json()
        assert d["fornecedor"] == "Empresa ABC Lda"
        assert d["valor_real"] == 14500.0
        assert d["estado"] == "Adjudicado"

    def test_eliminar_contrato(self, client):
        _login(client)
        pid = _project(client)
        cr = client.post(f"/api/projects/{pid}/procurement", json={
            "titulo": "Para apagar", "tipo": "Consultoria",
        })
        cid = cr.get_json()["id"]
        r = client.delete(f"/api/projects/{pid}/procurement/{cid}")
        assert r.status_code == 200
        items = client.get(f"/api/projects/{pid}/procurement").get_json()
        assert all(c["id"] != cid for c in items)

    def test_contratos_isolados_por_projeto(self, client):
        _login(client)
        pid1 = _project(client, "P1")
        pid2 = _project(client, "P2")
        client.post(f"/api/projects/{pid1}/procurement", json={"titulo": "C do P1", "tipo": "Bens"})
        r = client.get(f"/api/projects/{pid2}/procurement")
        assert r.get_json() == []

    def test_sem_autenticacao_retorna_401(self, client):
        r = client.get("/api/projects/1/procurement")
        assert r.status_code == 401


# ── Excel Export ─────────────────────────────────────────────────────────────

class TestExcelExport:
    def test_requer_autenticacao(self, client):
        r = client.get("/api/projects/1/export/excel")
        assert r.status_code == 401

    def test_projeto_inexistente_retorna_404(self, client):
        _login(client)
        r = client.get("/api/projects/99999/export/excel")
        assert r.status_code == 404

    def test_excel_gerado_com_projeto_vazio(self, client):
        _login(client)
        pid = _project(client, "Projeto Excel Vazio")

        try:
            import openpyxl  # noqa: F401
        except ImportError:
            pytest.skip("openpyxl não está instalado")

        r = client.get(f"/api/projects/{pid}/export/excel")
        assert r.status_code == 200
        assert "spreadsheetml" in r.content_type or "application/vnd" in r.content_type
        assert r.data[:4] == b"PK\x03\x04"  # ZIP magic bytes (xlsx is a zip)

    def test_excel_gerado_com_dados(self, client):
        _login(client)
        pid = _project(client, "Projeto Excel Dados")

        # Add some data
        client.post(f"/api/projects/{pid}/tasks", json={"title": "Tarefa 1", "status": "todo"})
        client.post(f"/api/projects/{pid}/risks", json={
            "descricao": "Risco 1", "probabilidade": "Médio", "impacto": "Alto", "mitigacao": "M1",
        })
        client.post(f"/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1",
            "nivel": "Resultado", "meta": 100, "baseline": 0,
        })
        client.post(f"/api/projects/{pid}/lessons", json={
            "titulo": "Lição Excel", "tipo": "Positiva",
            "area": "Gestão", "fase_projeto": "Execução", "impacto": "Alto",
        })

        try:
            import openpyxl  # noqa: F401
        except ImportError:
            pytest.skip("openpyxl não está instalado")

        r = client.get(f"/api/projects/{pid}/export/excel")
        assert r.status_code == 200
        assert r.data[:4] == b"PK\x03\x04"

        # Verify workbook has multiple sheets
        import io
        wb = openpyxl.load_workbook(io.BytesIO(r.data))
        sheet_names = wb.sheetnames
        assert "Quadro Lógico" in sheet_names or any("logico" in s.lower() for s in sheet_names)
        assert len(sheet_names) >= 4


# ── Donor Reports ─────────────────────────────────────────────────────────────

class TestDonorReports:
    def test_eu_prag_requer_autenticacao(self, client):
        r = client.get("/api/projects/1/donor-report/eu-prag")
        assert r.status_code == 401

    def test_usaid_requer_autenticacao(self, client):
        r = client.get("/api/projects/1/donor-report/usaid")
        assert r.status_code == 401

    def test_eu_prag_projeto_inexistente(self, client):
        _login(client)
        r = client.get("/api/projects/99999/donor-report/eu-prag")
        assert r.status_code == 404

    def test_eu_prag_gera_pdf(self, client):
        _login(client)
        pid = _project(client, "Projeto UE")

        try:
            import reportlab  # noqa: F401
        except ImportError:
            pytest.skip("reportlab não está instalado")

        r = client.get(f"/api/projects/{pid}/donor-report/eu-prag")
        assert r.status_code == 200
        assert r.content_type == "application/pdf"
        assert r.data[:4] == b"%PDF"

    def test_usaid_gera_pdf(self, client):
        _login(client)
        pid = _project(client, "Projeto USAID")

        try:
            import reportlab  # noqa: F401
        except ImportError:
            pytest.skip("reportlab não está instalado")

        r = client.get(f"/api/projects/{pid}/donor-report/usaid")
        assert r.status_code == 200
        assert r.content_type == "application/pdf"
        assert r.data[:4] == b"%PDF"


# ── Portfolio Dashboard ───────────────────────────────────────────────────────

class TestPortfolioDashboard:
    def test_requer_autenticacao(self, client):
        r = client.get("/api/portfolio/dashboard")
        assert r.status_code == 401

    def test_portfolio_vazio_devolve_estrutura(self, client):
        _login(client)
        r = client.get("/api/portfolio/dashboard")
        assert r.status_code == 200
        d = r.get_json()
        assert "summary" in d
        assert "projects" in d
        assert "recommendations" in d
        assert "total_projects" in d["summary"]

    def test_portfolio_com_projetos(self, client):
        _login(client)
        _project(client, "Porto P1")
        _project(client, "Porto P2")
        r = client.get("/api/portfolio/dashboard")
        assert r.status_code == 200
        d = r.get_json()
        assert d["summary"]["total_projects"] >= 2

    def test_portfolio_health_scores_presentes(self, client):
        _login(client)
        _project(client, "Porto Health")
        r = client.get("/api/portfolio/dashboard")
        d = r.get_json()
        assert d["summary"]["average_health"] >= 0
        for proj in d["projects"]:
            assert "health" in proj
            assert "score" in proj["health"]
            assert "status" in proj["health"]

    def test_portfolio_summary_tem_financas(self, client):
        _login(client)
        r = client.get("/api/portfolio/dashboard")
        d = r.get_json()
        assert "total_budget" in d["summary"]
        assert "executed_budget" in d["summary"]
        assert "total_beneficiaries" in d["summary"]
