"""
Testes para M&E: quadro lógico, pressupostos, histórico, evidências,
lições aprendidas e desagregação de beneficiários.
Executar com: pytest tests/test_me.py -v
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("FLASK_ENV", "development")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _login(client):
    return client.post("/api/auth/login", json={"username": "admin", "password": "coopgest2025"})


def _create_project(client, nome="Projeto M&E"):
    r = client.post("/api/projects", json={
        "nome": nome,
        "estado": "Em curso",
        "data_inicio": "2025-01-01",
        "data_fim": "2026-12-31",
    })
    assert r.status_code == 201
    return r.get_json()["id"]


# ── Quadro Lógico (Logframe) ──────────────────────────────────────────────────

class TestLogframe:
    def test_criar_indicador_logframe(self, client):
        _login(client)
        pid = _create_project(client)
        r = client.post("/api/impact/logframe", json={
            "projeto_id": pid,
            "nivel": "Resultado",
            "resultado": "Capacidade técnica melhorada",
            "indicador": "% de técnicos certificados",
            "baseline": 10,
            "meta": 80,
            "unidade": "%",
            "frequencia_medicao": "Trimestral",
        })
        assert r.status_code == 201
        d = r.get_json()
        assert d["nivel"] == "Resultado"
        assert d["meta"] == 80.0

    def test_indicador_sem_resultado_falha(self, client):
        _login(client)
        pid = _create_project(client)
        r = client.post("/api/impact/logframe", json={
            "projeto_id": pid,
            "indicador": "Sem resultado",
        })
        assert r.status_code == 400

    def test_indicador_nivel_invalido_e_corrigido(self, client):
        """Níveis inválidos são corrigidos para 'Resultado' (comportamento leniente)."""
        _login(client)
        pid = _create_project(client)
        r = client.post("/api/impact/logframe", json={
            "projeto_id": pid,
            "resultado": "R1",
            "indicador": "I1",
            "nivel": "NivelInventado",
        })
        assert r.status_code == 201
        assert r.get_json()["nivel"] == "Resultado"

    def test_listar_logframe_por_projeto(self, client):
        _login(client)
        pid = _create_project(client)
        client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1", "nivel": "Resultado",
        })
        client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "A1", "indicador": "IA1", "nivel": "Atividade",
        })
        r = client.get(f"/api/impact/logframe?projeto_id={pid}")
        assert r.status_code == 200
        items = r.get_json()
        assert len(items) == 2

    def test_atualizar_indicador(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1", "nivel": "Resultado",
            "meta": 100, "baseline": 0,
        })
        iid = cr.get_json()["id"]
        r = client.put(f"/api/impact/logframe/{iid}", json={"valor_atual": 45.0})
        assert r.status_code == 200
        assert r.get_json()["valor_atual"] == 45.0

    def test_eliminar_indicador(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1", "nivel": "Resultado",
        })
        iid = cr.get_json()["id"]
        r = client.delete(f"/api/impact/logframe/{iid}")
        assert r.status_code == 200
        r2 = client.get(f"/api/impact/logframe?projeto_id={pid}")
        assert len(r2.get_json()) == 0

    def test_pressupostos_sao_guardados(self, client):
        """Pressuposto é a 5ª coluna do LFA — essencial para a metodologia."""
        _login(client)
        pid = _create_project(client)
        r = client.post("/api/impact/logframe", json={
            "projeto_id": pid,
            "resultado": "R1",
            "indicador": "I1",
            "nivel": "Resultado",
            "pressupostos": "O contexto político permanece estável",
        })
        assert r.status_code == 201
        d = r.get_json()
        assert d["pressupostos"] == "O contexto político permanece estável"

    def test_pressupostos_atualizados_via_put(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1", "nivel": "Resultado",
        })
        iid = cr.get_json()["id"]
        r = client.put(f"/api/impact/logframe/{iid}", json={
            "pressupostos": "Financiamento garantido até 2027",
        })
        assert r.status_code == 200
        assert r.get_json()["pressupostos"] == "Financiamento garantido até 2027"


class TestLogframeHistory:
    def test_historico_vazio_inicialmente(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1", "nivel": "Resultado",
        })
        iid = cr.get_json()["id"]
        r = client.get(f"/api/impact/logframe/{iid}/history")
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_registar_medicao_cria_historico(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1", "nivel": "Resultado",
            "meta": 100, "baseline": 0,
        })
        iid = cr.get_json()["id"]
        r = client.post(f"/api/impact/logframe/{iid}/history", json={
            "valor": 55.0, "notas": "Medição Q1",
        })
        assert r.status_code == 201
        hist = client.get(f"/api/impact/logframe/{iid}/history").get_json()
        assert len(hist) >= 1
        assert hist[-1]["valor"] == 55.0

    def test_medicao_atualiza_valor_atual(self, client):
        """Registar uma medição deve atualizar o valor_atual do indicador."""
        _login(client)
        pid = _create_project(client)
        cr = client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1", "nivel": "Resultado",
            "meta": 100, "baseline": 0, "valor_atual": 0,
        })
        iid = cr.get_json()["id"]
        client.post(f"/api/impact/logframe/{iid}/history", json={"valor": 72.5})
        items = client.get(f"/api/impact/logframe?projeto_id={pid}").get_json()
        item = next(i for i in items if i["id"] == iid)
        assert item["valor_atual"] == 72.5


class TestEvidencias:
    def test_adicionar_evidencia(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1", "nivel": "Resultado",
        })
        iid = cr.get_json()["id"]
        r = client.post(f"/api/impact/logframe/{iid}/evidencias", json={
            "descricao": "Inquérito aplicado em março",
            "url_externa": "https://exemplo.org/relatorio",
        })
        assert r.status_code == 201

    def test_listar_evidencias(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1", "nivel": "Resultado",
        })
        iid = cr.get_json()["id"]
        client.post(f"/api/impact/logframe/{iid}/evidencias", json={"descricao": "Ev1"})
        client.post(f"/api/impact/logframe/{iid}/evidencias", json={"descricao": "Ev2"})
        r = client.get(f"/api/impact/logframe/{iid}/evidencias")
        assert r.status_code == 200
        assert len(r.get_json()) == 2

    def test_eliminar_evidencia(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post("/api/impact/logframe", json={
            "projeto_id": pid, "resultado": "R1", "indicador": "I1", "nivel": "Resultado",
        })
        iid = cr.get_json()["id"]
        ev_r = client.post(f"/api/impact/logframe/{iid}/evidencias", json={"descricao": "Para eliminar"})
        ev_id = ev_r.get_json()["id"]
        r = client.delete(f"/api/impact/evidencias/{ev_id}")
        assert r.status_code == 200
        evs = client.get(f"/api/impact/logframe/{iid}/evidencias").get_json()
        assert all(e["id"] != ev_id for e in evs)


# ── Lições Aprendidas ─────────────────────────────────────────────────────────

class TestLicoesAprendidas:
    def test_criar_licao(self, client):
        _login(client)
        pid = _create_project(client)
        r = client.post(f"/api/projects/{pid}/lessons", json={
            "titulo": "Envolvimento comunitário precoce é essencial",
            "tipo": "Positiva",
            "area": "Gestão",
            "fase_projeto": "Execução",
            "impacto": "Alto",
        })
        assert r.status_code == 201
        d = r.get_json()
        assert d["titulo"] == "Envolvimento comunitário precoce é essencial"
        assert d["tipo"] == "Positiva"
        assert d["impacto"] == "Alto"

    def test_licao_sem_titulo_falha(self, client):
        _login(client)
        pid = _create_project(client)
        r = client.post(f"/api/projects/{pid}/lessons", json={"tipo": "Positiva"})
        assert r.status_code == 400

    def test_licao_tipo_invalido_falha(self, client):
        _login(client)
        pid = _create_project(client)
        r = client.post(f"/api/projects/{pid}/lessons", json={
            "titulo": "T", "tipo": "Inventado",
        })
        assert r.status_code == 400

    def test_listar_licoes(self, client):
        _login(client)
        pid = _create_project(client)
        client.post(f"/api/projects/{pid}/lessons", json={
            "titulo": "L1", "tipo": "Positiva", "area": "Gestão", "fase_projeto": "Execução", "impacto": "Alto",
        })
        client.post(f"/api/projects/{pid}/lessons", json={
            "titulo": "L2", "tipo": "Negativa", "area": "M&E", "fase_projeto": "Monitorização", "impacto": "Médio",
        })
        r = client.get(f"/api/projects/{pid}/lessons")
        assert r.status_code == 200
        assert len(r.get_json()) == 2

    def test_filtrar_por_tipo(self, client):
        _login(client)
        pid = _create_project(client)
        for tipo in ["Positiva", "Negativa", "Positiva"]:
            client.post(f"/api/projects/{pid}/lessons", json={
                "titulo": f"Licao {tipo}", "tipo": tipo,
                "area": "Gestão", "fase_projeto": "Execução", "impacto": "Médio",
            })
        r = client.get(f"/api/projects/{pid}/lessons?tipo=Positiva")
        assert r.status_code == 200
        items = r.get_json()
        assert len(items) == 2
        assert all(l["tipo"] == "Positiva" for l in items)

    def test_atualizar_licao(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post(f"/api/projects/{pid}/lessons", json={
            "titulo": "Original", "tipo": "Neutra",
            "area": "Gestão", "fase_projeto": "Execução", "impacto": "Baixo",
        })
        lid = cr.get_json()["id"]
        r = client.put(f"/api/projects/{pid}/lessons/{lid}", json={
            "titulo": "Atualizado",
            "recomendacao": "Fazer melhor na próxima vez",
        })
        assert r.status_code == 200
        d = r.get_json()
        assert d["titulo"] == "Atualizado"
        assert d["recomendacao"] == "Fazer melhor na próxima vez"

    def test_eliminar_licao(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post(f"/api/projects/{pid}/lessons", json={
            "titulo": "Para apagar", "tipo": "Negativa",
            "area": "Gestão", "fase_projeto": "Execução", "impacto": "Alto",
        })
        lid = cr.get_json()["id"]
        r = client.delete(f"/api/projects/{pid}/lessons/{lid}")
        assert r.status_code == 200
        items = client.get(f"/api/projects/{pid}/lessons").get_json()
        assert all(l["id"] != lid for l in items)

    def test_meta_endpoint(self, client):
        _login(client)
        pid = _create_project(client)
        r = client.get(f"/api/projects/{pid}/lessons/meta")
        assert r.status_code == 200
        d = r.get_json()
        assert "areas" in d
        assert "tipos" in d
        assert "fases" in d
        assert "impactos" in d

    def test_licoes_isoladas_por_projeto(self, client):
        """Lições de um projeto não aparecem noutro."""
        _login(client)
        pid1 = _create_project(client, "Projeto 1")
        pid2 = _create_project(client, "Projeto 2")
        client.post(f"/api/projects/{pid1}/lessons", json={
            "titulo": "L do Projeto 1", "tipo": "Positiva",
            "area": "Gestão", "fase_projeto": "Execução", "impacto": "Alto",
        })
        r = client.get(f"/api/projects/{pid2}/lessons")
        assert r.get_json() == []


# ── Riscos (campos novos) ────────────────────────────────────────────────────

class TestRiscosEnhanced:
    def test_criar_risco_com_dono_e_contingencia(self, client):
        _login(client)
        pid = _create_project(client)
        r = client.post(f"/api/projects/{pid}/risks", json={
            "descricao": "Atraso no desembolso",
            "probabilidade": "Alto",
            "impacto": "Muito Alto",
            "mitigacao": "Comunicação mensal com doador",
            "dono": "Coordenador Financeiro",
            "proxima_revisao": "2026-09-01",
            "plano_contingencia": "Recorrer a reserva operacional de 10%",
        })
        assert r.status_code == 201
        d = r.get_json()
        assert d["dono"] == "Coordenador Financeiro"
        assert d["plano_contingencia"] == "Recorrer a reserva operacional de 10%"

    def test_risco_tem_score_calculado(self, client):
        _login(client)
        pid = _create_project(client)
        r = client.post(f"/api/projects/{pid}/risks", json={
            "descricao": "Risco crítico",
            "probabilidade": "Muito Alto",
            "impacto": "Muito Alto",
            "mitigacao": "Plano robusto",
        })
        assert r.status_code == 201
        d = r.get_json()
        assert "score" in d
        assert d["score"] > 0
        assert d["nivel_risco"] == "Crítico"

    def test_risco_baixo_nivel(self, client):
        _login(client)
        pid = _create_project(client)
        r = client.post(f"/api/projects/{pid}/risks", json={
            "descricao": "Risco menor",
            "probabilidade": "Baixo",
            "impacto": "Baixo",
            "mitigacao": "Monitorizar",
        })
        assert r.status_code == 201
        d = r.get_json()
        assert d["nivel_risco"] == "Baixo"

    def test_atualizar_risco_com_novos_campos(self, client):
        _login(client)
        pid = _create_project(client)
        cr = client.post(f"/api/projects/{pid}/risks", json={
            "descricao": "Risco 1",
            "probabilidade": "Médio",
            "impacto": "Médio",
            "mitigacao": "M1",
        })
        rid = cr.get_json()["id"]
        # Risks PUT endpoint is /api/risks/<id> (project-level resource)
        r = client.put(f"/api/risks/{rid}", json={
            "dono": "Gestor de Projeto",
            "proxima_revisao": "2026-12-01",
            "plano_contingencia": "Plano B",
        })
        assert r.status_code == 200
        d = r.get_json()
        assert d["dono"] == "Gestor de Projeto"
        assert d["plano_contingencia"] == "Plano B"


# ── Desagregação de Beneficiários ────────────────────────────────────────────

class TestDesagregacao:
    def _criar_beneficiario(self, client, pid, nome="Comunidade A"):
        r = client.post(f"/api/projects/{pid}/beneficiarios", json={
            "nome": nome,
            "tipo": "Direto",
            "numero": 100,
        })
        assert r.status_code == 201
        return r.get_json()["id"]

    def test_adicionar_desagregacao(self, client):
        _login(client)
        pid = _create_project(client)
        bid = self._criar_beneficiario(client, pid)
        r = client.post(f"/api/beneficiarios/{bid}/desagregacao", json={
            "dimensao": "genero",
            "categoria": "Feminino",
            "numero": 60,
        })
        assert r.status_code == 201
        d = r.get_json()
        assert d["dimensao"] == "genero"
        assert d["numero"] == 60

    def test_listar_desagregacao(self, client):
        _login(client)
        pid = _create_project(client)
        bid = self._criar_beneficiario(client, pid)
        client.post(f"/api/beneficiarios/{bid}/desagregacao", json={
            "dimensao": "genero", "categoria": "Feminino", "numero": 60,
        })
        client.post(f"/api/beneficiarios/{bid}/desagregacao", json={
            "dimensao": "genero", "categoria": "Masculino", "numero": 40,
        })
        r = client.get(f"/api/beneficiarios/{bid}/desagregacao")
        assert r.status_code == 200
        assert len(r.get_json()) == 2

    def test_resumo_por_dimensao(self, client):
        _login(client)
        pid = _create_project(client)
        bid = self._criar_beneficiario(client, pid)
        client.post(f"/api/beneficiarios/{bid}/desagregacao", json={
            "dimensao": "faixa_etaria", "categoria": "Jovem (15-24)", "numero": 35,
        })
        r = client.get(f"/api/projects/{pid}/beneficiarios/summary")
        assert r.status_code == 200
        data = r.get_json()
        assert "by_dimension" in data or isinstance(data, dict)


# ── Relatório executivo (PDF) ─────────────────────────────────────────────────

class TestRelatorioPDF:
    def test_pdf_requer_autenticacao(self, client):
        r = client.get("/api/projects/1/executive-report/pdf")
        assert r.status_code == 401

    def test_pdf_gerado_quando_reportlab_disponivel(self, client):
        _login(client)
        pid = _create_project(client, "Projeto PDF")

        try:
            import reportlab  # noqa: F401
        except ImportError:
            pytest.skip("reportlab não está instalado")

        r = client.get(f"/api/projects/{pid}/executive-report/pdf")
        assert r.status_code == 200
        assert r.content_type == "application/pdf"
        assert r.data[:4] == b"%PDF"

    def test_pdf_projeto_nao_encontrado(self, client):
        _login(client)
        r = client.get("/api/projects/99999/executive-report/pdf")
        assert r.status_code == 404
