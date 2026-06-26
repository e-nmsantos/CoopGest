"""
Testes para fase 4: Stakeholders, IATI XML, alertas de email.
Executar com: pytest tests/test_phase4.py -v
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


def _project(client, nome="Proj Fase4"):
    r = client.post("/api/projects", json={
        "nome": nome, "estado": "Em curso",
        "data_inicio": "2025-01-01", "data_fim": "2026-12-31",
    })
    assert r.status_code == 201
    return r.get_json()["id"]


def _stakeholder(client, pid, nome="Parceiro Teste", **kwargs):
    payload = {"nome": nome, "interesse": "Alto", "influencia": "Alto", **kwargs}
    r = client.post(f"/api/projects/{pid}/stakeholders", json=payload)
    assert r.status_code == 201
    return r.get_json()["id"]


# ── Stakeholders ──────────────────────────────────────────────────────────────

class TestStakeholders:
    def test_meta_endpoint(self, client):
        _login(client)
        pid = _project(client)
        r = client.get(f"/api/projects/{pid}/stakeholders/meta")
        assert r.status_code == 200
        d = r.get_json()
        assert "niveis" in d and "posicoes" in d
        assert "Alto" in d["niveis"]
        assert "Apoiante" in d["posicoes"]
        assert "Neutro" in d["posicoes"]
        assert "Oponente" in d["posicoes"]

    def test_criar_stakeholder(self, client):
        _login(client)
        pid = _project(client)
        r = client.post(f"/api/projects/{pid}/stakeholders", json={
            "nome": "Ministério da Educação",
            "organizacao": "Governo",
            "papel": "Financiador",
            "interesse": "Alto",
            "influencia": "Alto",
            "posicao": "Apoiante",
        })
        assert r.status_code == 201
        d = r.get_json()
        assert d["nome"] == "Ministério da Educação"
        assert d["interesse"] == "Alto"
        assert d["posicao"] == "Apoiante"

    def test_nome_obrigatorio(self, client):
        _login(client)
        pid = _project(client)
        r = client.post(f"/api/projects/{pid}/stakeholders", json={"organizacao": "X"})
        assert r.status_code == 400

    def test_interesse_invalido_falha(self, client):
        _login(client)
        pid = _project(client)
        r = client.post(f"/api/projects/{pid}/stakeholders", json={
            "nome": "X", "interesse": "Máximo",
        })
        assert r.status_code == 400

    def test_posicao_invalida_falha(self, client):
        _login(client)
        pid = _project(client)
        r = client.post(f"/api/projects/{pid}/stakeholders", json={
            "nome": "X", "posicao": "Desconhecido",
        })
        assert r.status_code == 400

    def test_listar_stakeholders(self, client):
        _login(client)
        pid = _project(client)
        _stakeholder(client, pid, "S1")
        _stakeholder(client, pid, "S2")
        r = client.get(f"/api/projects/{pid}/stakeholders")
        assert r.status_code == 200
        assert len(r.get_json()) == 2

    def test_atualizar_stakeholder(self, client):
        _login(client)
        pid = _project(client)
        sk_id = _stakeholder(client, pid, "Original")
        r = client.put(f"/api/projects/{pid}/stakeholders/{sk_id}", json={
            "estrategia": "Reuniões mensais de acompanhamento",
            "posicao": "Apoiante",
            "contacto": "email@gov.pt",
        })
        assert r.status_code == 200
        d = r.get_json()
        assert d["estrategia"] == "Reuniões mensais de acompanhamento"
        assert d["contacto"] == "email@gov.pt"

    def test_eliminar_stakeholder(self, client):
        _login(client)
        pid = _project(client)
        sk_id = _stakeholder(client, pid, "Para apagar")
        r = client.delete(f"/api/projects/{pid}/stakeholders/{sk_id}")
        assert r.status_code == 200
        items = client.get(f"/api/projects/{pid}/stakeholders").get_json()
        assert all(s["id"] != sk_id for s in items)

    def test_stakeholders_isolados_por_projeto(self, client):
        _login(client)
        pid1 = _project(client, "P1 SK")
        pid2 = _project(client, "P2 SK")
        _stakeholder(client, pid1, "S do P1")
        r = client.get(f"/api/projects/{pid2}/stakeholders")
        assert r.get_json() == []

    def test_sem_autenticacao_retorna_401(self, client):
        r = client.get("/api/projects/1/stakeholders")
        assert r.status_code == 401

    def test_matrix_endpoint(self, client):
        _login(client)
        pid = _project(client)
        _stakeholder(client, pid, "Chave", interesse="Alto", influencia="Alto", posicao="Apoiante")
        _stakeholder(client, pid, "Satisfazer", interesse="Baixo", influencia="Alto", posicao="Neutro")
        _stakeholder(client, pid, "Informar", interesse="Alto", influencia="Baixo", posicao="Neutro")
        _stakeholder(client, pid, "Monitorizar", interesse="Baixo", influencia="Baixo", posicao="Oponente")

        r = client.get(f"/api/projects/{pid}/stakeholders/matrix")
        assert r.status_code == 200
        d = r.get_json()
        assert "gerir_de_perto" in d
        assert "manter_satisfeito" in d
        assert "manter_informado" in d
        assert "monitorizar" in d
        assert len(d["gerir_de_perto"]) == 1
        assert d["gerir_de_perto"][0]["nome"] == "Chave"
        assert len(d["manter_satisfeito"]) == 1
        assert len(d["manter_informado"]) == 1
        assert len(d["monitorizar"]) == 1

    def test_matrix_com_medio(self, client):
        _login(client)
        pid = _project(client)
        _stakeholder(client, pid, "MedioMedio", interesse="Médio", influencia="Médio", posicao="Neutro")
        r = client.get(f"/api/projects/{pid}/stakeholders/matrix")
        d = r.get_json()
        assert len(d["monitorizar"]) == 1
        assert d["monitorizar"][0]["nome"] == "MedioMedio"


# ── IATI XML Export ───────────────────────────────────────────────────────────

class TestIATIExport:
    def test_requer_autenticacao(self, client):
        r = client.get("/api/projects/1/export/iati")
        assert r.status_code == 401

    def test_projeto_inexistente(self, client):
        _login(client)
        r = client.get("/api/projects/99999/export/iati")
        assert r.status_code == 404

    def test_iati_gera_xml(self, client):
        _login(client)
        pid = _project(client, "Projeto IATI")
        r = client.get(f"/api/projects/{pid}/export/iati")
        assert r.status_code == 200
        assert "xml" in r.content_type
        content = r.data.decode("utf-8")
        assert "<?xml" in content
        assert "iati-activities" in content

    def test_iati_versao_2_03(self, client):
        _login(client)
        pid = _project(client, "Projeto IATI 203")
        r = client.get(f"/api/projects/{pid}/export/iati")
        content = r.data.decode("utf-8")
        assert 'version="2.03"' in content

    def test_iati_contém_nome_projeto(self, client):
        _login(client)
        pid = _project(client, "Educação Para Todos")
        r = client.get(f"/api/projects/{pid}/export/iati")
        content = r.data.decode("utf-8")
        assert "Educação Para Todos" in content

    def test_iati_com_logframe_inclui_resultado(self, client):
        _login(client)
        pid = _project(client, "Projeto IATI LFA")
        client.post("/api/impact/logframe", json={
            "projeto_id": pid,
            "resultado": "Taxa de escolarização aumentada",
            "indicador": "% de crianças na escola",
            "nivel": "Resultado",
            "meta": 90,
            "baseline": 60,
        })
        r = client.get(f"/api/projects/{pid}/export/iati")
        content = r.data.decode("utf-8")
        assert "result" in content.lower()
        assert "Taxa de escolarização aumentada" in content

    def test_iati_content_disposition(self, client):
        _login(client)
        pid = _project(client, "Projeto IATI CD")
        r = client.get(f"/api/projects/{pid}/export/iati")
        assert "attachment" in r.headers.get("Content-Disposition", "")
        assert ".xml" in r.headers.get("Content-Disposition", "")


# ── Alertas de Projeto ────────────────────────────────────────────────────────

class TestProjectAlerts:
    def test_requer_autenticacao(self, client):
        r = client.get("/api/projects/1/alerts")
        assert r.status_code == 401

    def test_projeto_sem_alertas(self, client):
        _login(client)
        pid = _project(client, "Projeto Saudável")
        r = client.get(f"/api/projects/{pid}/alerts")
        assert r.status_code == 200
        d = r.get_json()
        assert "total" in d
        assert "alerts" in d
        assert "tarefas_atrasadas" in d["alerts"]
        assert "milestones_atrasados" in d["alerts"]
        assert "riscos_para_revisao" in d["alerts"]
        assert "indicadores_sem_atualizacao" in d["alerts"]

    def test_tarefa_atrasada_gera_alerta(self, client):
        _login(client)
        pid = _project(client, "Projeto Com Atraso")
        client.post(f"/api/projects/{pid}/tasks", json={
            "title": "Tarefa Atrasada",
            "status": "todo",
            "data_fim": "2020-01-01",
        })
        r = client.get(f"/api/projects/{pid}/alerts")
        d = r.get_json()
        assert d["total"] >= 1
        assert len(d["alerts"]["tarefas_atrasadas"]) >= 1

    def test_tarefa_concluida_nao_gera_alerta(self, client):
        _login(client)
        pid = _project(client, "Projeto Concluído")
        client.post(f"/api/projects/{pid}/tasks", json={
            "title": "Feita",
            "status": "done",
            "data_fim": "2020-01-01",
        })
        r = client.get(f"/api/projects/{pid}/alerts")
        d = r.get_json()
        atrasadas = [t for t in d["alerts"]["tarefas_atrasadas"] if t.get("title") == "Feita"]
        assert len(atrasadas) == 0

    def test_send_alert_sem_email_falha(self, client):
        _login(client)
        pid = _project(client, "Proj Alert Email")
        r = client.post(f"/api/projects/{pid}/alerts/send", json={})
        # sem email configurado no server de teste, espera-se 400 (sem email) ou 200 com error
        # aceita 400 (sem destinatário) OU 200 (com sent=False por falta de SMTP)
        assert r.status_code in (200, 400)

    def test_admin_send_all_alerts(self, client):
        _login(client)
        r = client.post("/api/system/send-alerts")
        assert r.status_code == 200
        d = r.get_json()
        assert "projects_checked" in d
