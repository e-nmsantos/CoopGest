"""
Testes para os endpoints de impacto do CoopGest.

Endpoints cobertos (coopgest/routes/impact.py):
  GET/POST /api/impact/metrics
  PUT/DELETE /api/impact/metrics/<id>
  GET /api/impact/metrics/<id>/history
  GET/POST /api/impact/logframe
  PUT/DELETE /api/impact/logframe/<id>
  GET/POST /api/impact/logframe/<id>/history
  GET/POST /api/impact/logframe/<id>/evidencias
  DELETE /api/impact/evidencias/<id>

Executar com: pytest tests/test_impact.py -v
"""

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _login(client):
    client.post("/api/auth/login", json={"username": "admin", "password": "coopgest2025"})


def _create_project(client, nome="Impact Proj"):
    r = client.post("/api/projects", json={
        "nome": nome,
        "estado": "Em curso",
        "data_inicio": "2025-01-01",
        "data_fim": "2026-12-31",
    })
    assert r.status_code == 201
    return r.get_json()["id"]


def _valid_metric_payload(projeto_id=None, **overrides):
    payload = {
        "nome": "Beneficiários alcançados",
        "valor_atual": 50,
        "meta": 200,
        "unidade": "pessoas",
        "categoria": "social",
        "ods": [1, 3],
    }
    if projeto_id is not None:
        payload["projeto_id"] = projeto_id
    payload.update(overrides)
    return payload


def _valid_logframe_payload(projeto_id, **overrides):
    payload = {
        "projeto_id": projeto_id,
        "resultado": "Aumento de rendimentos das famílias",
        "indicador": "Rendimento médio mensal",
        "nivel": "Resultado",
        "unidade": "EUR",
        "baseline": 400.0,
        "meta": 600.0,
        "valor_atual": 420.0,
        "estado": "Em acompanhamento",
        "frequencia_medicao": "Trimestral",
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Métricas de impacto
# ---------------------------------------------------------------------------

class TestImpactMetrics:
    def test_requer_autenticacao_get(self, client):
        r = client.get("/api/impact/metrics")
        assert r.status_code == 401

    def test_requer_autenticacao_post(self, client):
        r = client.post("/api/impact/metrics", json=_valid_metric_payload())
        assert r.status_code == 401

    def test_listar_metricas_vazia(self, client):
        _login(client)
        r = client.get("/api/impact/metrics")
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_criar_metrica_global(self, client):
        _login(client)
        r = client.post("/api/impact/metrics", json=_valid_metric_payload())
        assert r.status_code == 201
        data = r.get_json()
        assert data["nome"] == "Beneficiários alcançados"
        assert data["valor_atual"] == 50
        assert data["meta"] == 200
        assert data["categoria"] == "social"
        assert data["ods"] == [1, 3]

    def test_criar_metrica_com_projecto(self, client):
        _login(client)
        pid = _create_project(client, nome="Impact Metrics Proj")
        r = client.post("/api/impact/metrics", json=_valid_metric_payload(projeto_id=pid))
        assert r.status_code == 201
        assert r.get_json()["projeto_id"] == pid

    def test_criar_metrica_sem_campos_obrigatorios_retorna_400(self, client):
        _login(client)
        # Falta nome, valor_atual, meta, categoria
        r = client.post("/api/impact/metrics", json={"unidade": "pessoas"})
        assert r.status_code == 400

    def test_criar_metrica_categoria_invalida_retorna_400(self, client):
        _login(client)
        r = client.post("/api/impact/metrics", json=_valid_metric_payload(categoria="inventada"))
        assert r.status_code == 400

    def test_criar_metrica_ods_nao_lista_retorna_400(self, client):
        _login(client)
        payload = _valid_metric_payload()
        payload["ods"] = "1,3"
        r = client.post("/api/impact/metrics", json=payload)
        assert r.status_code == 400

    def test_listar_metricas_por_projecto(self, client):
        _login(client)
        pid = _create_project(client, nome="Filtrar Metrics")
        client.post("/api/impact/metrics", json=_valid_metric_payload(projeto_id=pid))
        client.post("/api/impact/metrics", json=_valid_metric_payload(nome="Outra métrica"))

        r = client.get(f"/api/impact/metrics?projeto_id={pid}")
        assert r.status_code == 200
        items = r.get_json()
        assert all(item["projeto_id"] == pid for item in items)
        assert len(items) == 1

    def test_atualizar_metrica(self, client):
        _login(client)
        r = client.post("/api/impact/metrics", json=_valid_metric_payload())
        mid = r.get_json()["id"]
        r2 = client.put(f"/api/impact/metrics/{mid}", json={"valor_atual": 75})
        assert r2.status_code == 200
        assert r2.get_json()["valor_atual"] == 75

    def test_atualizar_metrica_sem_campos_retorna_400(self, client):
        _login(client)
        r = client.post("/api/impact/metrics", json=_valid_metric_payload())
        mid = r.get_json()["id"]
        r2 = client.put(f"/api/impact/metrics/{mid}", json={})
        assert r2.status_code == 400

    def test_eliminar_metrica(self, client):
        _login(client)
        r = client.post("/api/impact/metrics", json=_valid_metric_payload())
        mid = r.get_json()["id"]
        r2 = client.delete(f"/api/impact/metrics/{mid}")
        assert r2.status_code == 200

    def test_eliminar_metrica_inexistente_retorna_404(self, client):
        _login(client)
        r = client.delete("/api/impact/metrics/99999")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Historial de métricas
# ---------------------------------------------------------------------------

class TestImpactMetricHistory:
    def test_requer_autenticacao(self, client):
        r = client.get("/api/impact/metrics/1/history")
        assert r.status_code == 401

    def test_historial_metrica_inexistente_retorna_404(self, client):
        _login(client)
        r = client.get("/api/impact/metrics/99999/history")
        assert r.status_code == 404

    def test_criacao_regista_valor_inicial_no_historial(self, client):
        _login(client)
        r = client.post("/api/impact/metrics", json=_valid_metric_payload(valor_atual=50))
        mid = r.get_json()["id"]
        hist = client.get(f"/api/impact/metrics/{mid}/history")
        assert hist.status_code == 200
        items = hist.get_json()
        assert len(items) >= 1
        assert items[0]["valor"] == 50

    def test_atualizacao_de_valor_regista_no_historial(self, client):
        _login(client)
        r = client.post("/api/impact/metrics", json=_valid_metric_payload(valor_atual=50))
        mid = r.get_json()["id"]
        client.put(f"/api/impact/metrics/{mid}", json={"valor_atual": 80})
        hist = client.get(f"/api/impact/metrics/{mid}/history")
        assert hist.status_code == 200
        valores = [item["valor"] for item in hist.get_json()]
        assert 50 in valores
        assert 80 in valores


# ---------------------------------------------------------------------------
# Quadro lógico (logframe)
# ---------------------------------------------------------------------------

class TestImpactLogframe:
    def test_requer_autenticacao_get(self, client):
        r = client.get("/api/impact/logframe?projeto_id=1")
        assert r.status_code == 401

    def test_requer_autenticacao_post(self, client):
        r = client.post("/api/impact/logframe", json={"projeto_id": 1, "resultado": "x", "indicador": "y"})
        assert r.status_code == 401

    def test_sem_projeto_id_retorna_400(self, client):
        _login(client)
        r = client.get("/api/impact/logframe")
        assert r.status_code == 400

    def test_projeto_inexistente_retorna_404(self, client):
        _login(client)
        r = client.get("/api/impact/logframe?projeto_id=99999")
        assert r.status_code == 404

    def test_listar_logframe_vazio(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe Empty")
        r = client.get(f"/api/impact/logframe?projeto_id={pid}")
        assert r.status_code == 200
        assert r.get_json() == []

    def test_criar_entrada_logframe(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe Create")
        r = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid))
        assert r.status_code == 201
        data = r.get_json()
        assert data["resultado"] == "Aumento de rendimentos das famílias"
        assert data["indicador"] == "Rendimento médio mensal"
        assert data["nivel"] == "Resultado"
        assert data["projeto_id"] == pid

    def test_criar_logframe_sem_resultado_retorna_400(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe No Result")
        payload = _valid_logframe_payload(pid)
        del payload["resultado"]
        r = client.post("/api/impact/logframe", json=payload)
        assert r.status_code == 400

    def test_criar_logframe_sem_indicador_retorna_400(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe No Indicator")
        payload = _valid_logframe_payload(pid)
        del payload["indicador"]
        r = client.post("/api/impact/logframe", json=payload)
        assert r.status_code == 400

    def test_listar_logframe_do_projecto(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe List")
        client.post("/api/impact/logframe", json=_valid_logframe_payload(pid))
        client.post("/api/impact/logframe", json=_valid_logframe_payload(pid, resultado="Outro resultado", indicador="Outro indicador"))
        r = client.get(f"/api/impact/logframe?projeto_id={pid}")
        assert r.status_code == 200
        items = r.get_json()
        assert len(items) == 2

    def test_atualizar_entrada_logframe(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe Update")
        cr = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid))
        lid = cr.get_json()["id"]
        r = client.put(f"/api/impact/logframe/{lid}", json={"estado": "Alcançado"})
        assert r.status_code == 200
        assert r.get_json()["estado"] == "Alcançado"

    def test_eliminar_entrada_logframe(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe Delete")
        cr = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid))
        lid = cr.get_json()["id"]
        r = client.delete(f"/api/impact/logframe/{lid}")
        assert r.status_code == 200
        # Verificar que foi eliminado
        list_r = client.get(f"/api/impact/logframe?projeto_id={pid}")
        assert list_r.get_json() == []

    def test_eliminar_logframe_inexistente_retorna_404(self, client):
        _login(client)
        r = client.delete("/api/impact/logframe/99999")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Historial do logframe
# ---------------------------------------------------------------------------

class TestLogframeHistory:
    def test_requer_autenticacao(self, client):
        r = client.get("/api/impact/logframe/1/history")
        assert r.status_code == 401

    def test_historial_indicador_inexistente_retorna_404(self, client):
        _login(client)
        r = client.get("/api/impact/logframe/99999/history")
        assert r.status_code == 404

    def test_criacao_regista_valor_inicial_no_historial(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe Hist Init")
        cr = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid, valor_atual=420.0))
        lid = cr.get_json()["id"]
        hist = client.get(f"/api/impact/logframe/{lid}/history")
        assert hist.status_code == 200
        items = hist.get_json()
        assert len(items) >= 1
        assert items[0]["valor"] == 420.0

    def test_post_historial_adiciona_medicao(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe Hist Post")
        cr = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid))
        lid = cr.get_json()["id"]
        r = client.post(f"/api/impact/logframe/{lid}/history", json={"valor": 500.0, "notas": "Medição Q2"})
        assert r.status_code == 201
        data = r.get_json()
        assert data["valor"] == 500.0
        assert data["notas"] == "Medição Q2"

    def test_post_historial_sem_valor_retorna_400(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe Hist No Val")
        cr = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid))
        lid = cr.get_json()["id"]
        r = client.post(f"/api/impact/logframe/{lid}/history", json={"notas": "Sem valor"})
        assert r.status_code == 400

    def test_post_historial_atualiza_valor_atual_do_indicador(self, client):
        _login(client)
        pid = _create_project(client, nome="Logframe Hist Sync")
        cr = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid, valor_atual=420.0))
        lid = cr.get_json()["id"]
        client.post(f"/api/impact/logframe/{lid}/history", json={"valor": 555.0})
        list_r = client.get(f"/api/impact/logframe?projeto_id={pid}")
        indicador = list_r.get_json()[0]
        assert indicador["valor_atual"] == 555.0


# ---------------------------------------------------------------------------
# Evidências do logframe
# ---------------------------------------------------------------------------

class TestLogframeEvidencias:
    def test_requer_autenticacao_get(self, client):
        r = client.get("/api/impact/logframe/1/evidencias")
        assert r.status_code == 401

    def test_indicador_inexistente_retorna_404(self, client):
        _login(client)
        r = client.get("/api/impact/logframe/99999/evidencias")
        assert r.status_code == 404

    def test_listar_evidencias_vazio(self, client):
        _login(client)
        pid = _create_project(client, nome="Evidencias Empty")
        cr = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid))
        lid = cr.get_json()["id"]
        r = client.get(f"/api/impact/logframe/{lid}/evidencias")
        assert r.status_code == 200
        assert r.get_json() == []

    def test_criar_evidencia(self, client):
        _login(client)
        pid = _create_project(client, nome="Evidencia Create")
        cr = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid))
        lid = cr.get_json()["id"]
        r = client.post(f"/api/impact/logframe/{lid}/evidencias", json={
            "descricao": "Relatório de campo",
            "tipo": "relatorio",
        })
        assert r.status_code == 201
        data = r.get_json()
        assert data["descricao"] == "Relatório de campo"
        assert data["tipo"] == "relatorio"

    def test_criar_evidencia_sem_descricao_retorna_400(self, client):
        _login(client)
        pid = _create_project(client, nome="Evidencia No Desc")
        cr = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid))
        lid = cr.get_json()["id"]
        r = client.post(f"/api/impact/logframe/{lid}/evidencias", json={"tipo": "url"})
        assert r.status_code == 400

    def test_eliminar_evidencia(self, client):
        _login(client)
        pid = _create_project(client, nome="Evidencia Delete")
        cr = client.post("/api/impact/logframe", json=_valid_logframe_payload(pid))
        lid = cr.get_json()["id"]
        ev_r = client.post(f"/api/impact/logframe/{lid}/evidencias", json={
            "descricao": "A eliminar",
            "tipo": "documento",
        })
        eid = ev_r.get_json()["id"]
        r = client.delete(f"/api/impact/evidencias/{eid}")
        assert r.status_code == 200

    def test_eliminar_evidencia_inexistente_retorna_404(self, client):
        _login(client)
        r = client.delete("/api/impact/evidencias/99999")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Isolamento por projecto
# ---------------------------------------------------------------------------

class TestImpactIsolation:
    def test_metricas_de_projecto_privado_nao_visiveis_a_outro_utilizador(self, client):
        """Admin cria projecto privado com métrica; utilizador sem acesso não a vê."""
        import app as app_module

        _login(client)

        pid = _create_project(client, nome="Privado Impact Isolamento")
        client.put(f"/api/projects/{pid}", json={"privado": True})
        client.post("/api/impact/metrics", json=_valid_metric_payload(projeto_id=pid))

        # Criar utilizador sem acesso ao projecto
        conn = app_module.get_db()
        conn.execute(
            "INSERT OR IGNORE INTO utilizadores (username, password_hash, nome, papel) VALUES (?,?,?,?)",
            ("impactuser", app_module.generate_password_hash("pass123"), "Impact User", "membro"),
        )
        conn.commit()
        conn.close()

        client.post("/api/auth/logout")
        client.post("/api/auth/login", json={"username": "impactuser", "password": "pass123"})

        r = client.get(f"/api/impact/metrics?projeto_id={pid}")
        # Sem acesso ao projecto privado deve receber 403
        assert r.status_code == 403

    def test_logframe_de_projecto_privado_nao_acessivel_a_outro_utilizador(self, client):
        """Logframe de projecto privado retorna 403 a utilizador sem acesso."""
        import app as app_module

        _login(client)

        pid = _create_project(client, nome="Privado Logframe Isolamento")
        client.put(f"/api/projects/{pid}", json={"privado": True})

        conn = app_module.get_db()
        conn.execute(
            "INSERT OR IGNORE INTO utilizadores (username, password_hash, nome, papel) VALUES (?,?,?,?)",
            ("logframeuser", app_module.generate_password_hash("pass123"), "Logframe User", "membro"),
        )
        conn.commit()
        conn.close()

        client.post("/api/auth/logout")
        client.post("/api/auth/login", json={"username": "logframeuser", "password": "pass123"})

        r = client.get(f"/api/impact/logframe?projeto_id={pid}")
        assert r.status_code == 403
