"""
Testes para os endpoints de lições aprendidas do CoopGest.

Endpoints cobertos (coopgest/routes/lessons.py):
  GET    /api/projects/<projeto_id>/lessons           — listar
  POST   /api/projects/<projeto_id>/lessons           — criar
  PUT    /api/projects/<projeto_id>/lessons/<id>      — editar
  DELETE /api/projects/<projeto_id>/lessons/<id>      — eliminar
  GET    /api/projects/<projeto_id>/lessons/meta      — metadados (áreas, fases, tipos, impactos)

Filtros suportados: area, tipo, fase

Executar com: pytest tests/test_licoes.py -v
"""

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _login(client):
    client.post("/api/auth/login", json={"username": "admin", "password": "coopgest2025"})


def _create_project(client, nome="Licoes Proj"):
    r = client.post("/api/projects", json={
        "nome": nome,
        "estado": "Em curso",
        "data_inicio": "2025-01-01",
        "data_fim": "2026-12-31",
    })
    assert r.status_code == 201
    return r.get_json()["id"]


def _valid_lesson(projeto_id=None, **overrides):
    payload = {
        "titulo": "Comunicação com beneficiários deve ser antecipada",
        "descricao": "Quando a comunicação é tardia, cria expectativas erradas.",
        "area": "Comunicação",
        "fase_projeto": "Execução",
        "tipo": "Negativa",
        "impacto": "Alto",
        "recomendacao": "Iniciar comunicação na fase de planeamento.",
    }
    if projeto_id is not None:
        payload["projeto_id"] = projeto_id
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# Meta endpoint
# ---------------------------------------------------------------------------

class TestLicoesMeta:
    def test_requer_autenticacao(self, client):
        r = client.get("/api/projects/1/lessons/meta")
        assert r.status_code == 401

    def test_meta_retorna_listas_de_opcoes(self, client):
        _login(client)
        pid = _create_project(client, nome="Meta Licoes")
        r = client.get(f"/api/projects/{pid}/lessons/meta")
        assert r.status_code == 200
        data = r.get_json()
        assert "areas" in data
        assert "fases" in data
        assert "tipos" in data
        assert "impactos" in data
        assert "Comunicação" in data["areas"]
        assert "Execução" in data["fases"]
        assert "Positiva" in data["tipos"]
        assert "Alto" in data["impactos"]


# ---------------------------------------------------------------------------
# Listar lições
# ---------------------------------------------------------------------------

class TestListarLicoes:
    def test_requer_autenticacao(self, client):
        r = client.get("/api/projects/1/lessons")
        assert r.status_code == 401

    def test_listar_licoes_projecto_inexistente_retorna_erro(self, client):
        _login(client)
        r = client.get("/api/projects/99999/lessons")
        assert r.status_code in (403, 404)

    def test_listar_licoes_vazio(self, client):
        _login(client)
        pid = _create_project(client, nome="Licoes Vazio")
        r = client.get(f"/api/projects/{pid}/lessons")
        assert r.status_code == 200
        assert r.get_json() == []

    def test_listar_licoes_existentes(self, client):
        _login(client)
        pid = _create_project(client, nome="Licoes Existentes")
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Lição A"))
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Lição B"))
        r = client.get(f"/api/projects/{pid}/lessons")
        assert r.status_code == 200
        items = r.get_json()
        assert len(items) == 2

    def test_filtrar_por_area(self, client):
        _login(client)
        pid = _create_project(client, nome="Licoes Filtro Area")
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Comunicacao", area="Comunicação"))
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Financeiro", area="Financeiro"))
        r = client.get(f"/api/projects/{pid}/lessons?area=Comunicação")
        assert r.status_code == 200
        items = r.get_json()
        assert len(items) == 1
        assert items[0]["area"] == "Comunicação"

    def test_filtrar_por_tipo(self, client):
        _login(client)
        pid = _create_project(client, nome="Licoes Filtro Tipo")
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Positiva", tipo="Positiva"))
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Negativa", tipo="Negativa"))
        r = client.get(f"/api/projects/{pid}/lessons?tipo=Positiva")
        assert r.status_code == 200
        items = r.get_json()
        assert len(items) == 1
        assert items[0]["tipo"] == "Positiva"

    def test_filtrar_por_fase(self, client):
        _login(client)
        pid = _create_project(client, nome="Licoes Filtro Fase")
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Inicio", fase_projeto="Início"))
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Execucao", fase_projeto="Execução"))
        r = client.get(f"/api/projects/{pid}/lessons?fase=Execução")
        assert r.status_code == 200
        items = r.get_json()
        assert len(items) == 1
        assert items[0]["fase_projeto"] == "Execução"

    def test_filtros_combinados(self, client):
        _login(client)
        pid = _create_project(client, nome="Licoes Filtros Combo")
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Match", area="Técnico", tipo="Positiva", fase_projeto="Planeamento"))
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="No match", area="Técnico", tipo="Negativa", fase_projeto="Planeamento"))
        r = client.get(f"/api/projects/{pid}/lessons?area=Técnico&tipo=Positiva")
        assert r.status_code == 200
        items = r.get_json()
        assert len(items) == 1
        assert items[0]["titulo"] == "Match"


# ---------------------------------------------------------------------------
# Criar lição
# ---------------------------------------------------------------------------

class TestCriarLicao:
    def test_requer_autenticacao(self, client):
        r = client.post("/api/projects/1/lessons", json=_valid_lesson())
        assert r.status_code == 401

    def test_criar_licao_valida(self, client):
        _login(client)
        pid = _create_project(client, nome="Criar Licao")
        r = client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson())
        assert r.status_code == 201
        data = r.get_json()
        assert data["titulo"] == "Comunicação com beneficiários deve ser antecipada"
        assert data["area"] == "Comunicação"
        assert data["tipo"] == "Negativa"
        assert data["fase_projeto"] == "Execução"
        assert data["impacto"] == "Alto"
        assert data["projeto_id"] == pid

    def test_criar_licao_sem_titulo_retorna_400(self, client):
        _login(client)
        pid = _create_project(client, nome="Criar Licao No Title")
        payload = _valid_lesson()
        del payload["titulo"]
        r = client.post(f"/api/projects/{pid}/lessons", json=payload)
        assert r.status_code == 400

    def test_criar_licao_area_invalida_retorna_400(self, client):
        _login(client)
        pid = _create_project(client, nome="Criar Licao Bad Area")
        r = client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(area="Inventada"))
        assert r.status_code == 400

    def test_criar_licao_tipo_invalido_retorna_400(self, client):
        _login(client)
        pid = _create_project(client, nome="Criar Licao Bad Tipo")
        r = client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(tipo="Inventado"))
        assert r.status_code == 400

    def test_criar_licao_fase_invalida_retorna_400(self, client):
        _login(client)
        pid = _create_project(client, nome="Criar Licao Bad Fase")
        r = client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(fase_projeto="Inventada"))
        assert r.status_code == 400

    def test_criar_licao_impacto_invalido_retorna_400(self, client):
        _login(client)
        pid = _create_project(client, nome="Criar Licao Bad Impacto")
        r = client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(impacto="Inventado"))
        assert r.status_code == 400

    def test_criar_licao_projecto_inexistente_retorna_erro(self, client):
        _login(client)
        r = client.post("/api/projects/99999/lessons", json=_valid_lesson())
        assert r.status_code in (403, 404)

    def test_licao_criada_aparece_na_listagem(self, client):
        _login(client)
        pid = _create_project(client, nome="Licao Aparece")
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Verificar Listagem"))
        r = client.get(f"/api/projects/{pid}/lessons")
        titulos = [l["titulo"] for l in r.get_json()]
        assert "Verificar Listagem" in titulos


# ---------------------------------------------------------------------------
# Editar lição
# ---------------------------------------------------------------------------

class TestEditarLicao:
    def test_requer_autenticacao(self, client):
        r = client.put("/api/projects/1/lessons/1", json={"titulo": "X"})
        assert r.status_code == 401

    def test_editar_licao_existente(self, client):
        _login(client)
        pid = _create_project(client, nome="Editar Licao")
        cr = client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Original"))
        lid = cr.get_json()["id"]
        r = client.put(f"/api/projects/{pid}/lessons/{lid}", json={"titulo": "Actualizado"})
        assert r.status_code == 200
        assert r.get_json()["titulo"] == "Actualizado"

    def test_editar_apenas_alguns_campos(self, client):
        _login(client)
        pid = _create_project(client, nome="Editar Parcial")
        cr = client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson())
        lid = cr.get_json()["id"]
        r = client.put(f"/api/projects/{pid}/lessons/{lid}", json={"impacto": "Baixo"})
        assert r.status_code == 200
        data = r.get_json()
        assert data["impacto"] == "Baixo"
        # Outros campos devem permanecer
        assert data["titulo"] == "Comunicação com beneficiários deve ser antecipada"

    def test_editar_licao_inexistente_retorna_404(self, client):
        _login(client)
        pid = _create_project(client, nome="Editar Inexistente")
        r = client.put(f"/api/projects/{pid}/lessons/99999", json={"titulo": "X"})
        assert r.status_code == 404

    def test_editar_sem_campos_retorna_400(self, client):
        _login(client)
        pid = _create_project(client, nome="Editar Sem Campos")
        cr = client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson())
        lid = cr.get_json()["id"]
        r = client.put(f"/api/projects/{pid}/lessons/{lid}", json={})
        assert r.status_code == 400

    def test_editar_licao_de_outro_projecto_retorna_404(self, client):
        """Lição do projecto A não pode ser editada via URL do projecto B."""
        _login(client)
        pid_a = _create_project(client, nome="Proj A Licao")
        pid_b = _create_project(client, nome="Proj B Licao")
        cr = client.post(f"/api/projects/{pid_a}/lessons", json=_valid_lesson(titulo="Da A"))
        lid = cr.get_json()["id"]
        r = client.put(f"/api/projects/{pid_b}/lessons/{lid}", json={"titulo": "Tentativa B"})
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Eliminar lição
# ---------------------------------------------------------------------------

class TestEliminarLicao:
    def test_requer_autenticacao(self, client):
        r = client.delete("/api/projects/1/lessons/1")
        assert r.status_code == 401

    def test_eliminar_licao_existente(self, client):
        _login(client)
        pid = _create_project(client, nome="Eliminar Licao")
        cr = client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson())
        lid = cr.get_json()["id"]
        r = client.delete(f"/api/projects/{pid}/lessons/{lid}")
        assert r.status_code == 200
        # Verificar que foi removida
        list_r = client.get(f"/api/projects/{pid}/lessons")
        assert all(l["id"] != lid for l in list_r.get_json())

    def test_eliminar_licao_inexistente_nao_levanta_erro(self, client):
        """O endpoint elimina silenciosamente — DELETE de id inexistente retorna 200 (sem erro)."""
        _login(client)
        pid = _create_project(client, nome="Eliminar Inexistente")
        r = client.delete(f"/api/projects/{pid}/lessons/99999")
        # A implementação actual não valida existência; retorna 200 ok
        assert r.status_code == 200

    def test_eliminar_licao_de_outro_projecto_nao_afecta(self, client):
        """Lição do projecto A não é eliminada via URL do projecto B."""
        _login(client)
        pid_a = _create_project(client, nome="Proj A Delete")
        pid_b = _create_project(client, nome="Proj B Delete")
        cr = client.post(f"/api/projects/{pid_a}/lessons", json=_valid_lesson(titulo="Protegida"))
        lid = cr.get_json()["id"]
        # Tentar eliminar via projecto B — não deve afectar
        client.delete(f"/api/projects/{pid_b}/lessons/{lid}")
        # Lição ainda deve existir no projecto A
        list_r = client.get(f"/api/projects/{pid_a}/lessons")
        ids = [l["id"] for l in list_r.get_json()]
        assert lid in ids


# ---------------------------------------------------------------------------
# Permissões — isolamento entre projectos/utilizadores
# ---------------------------------------------------------------------------

class TestLicoesPermissoes:
    def test_membro_sem_acesso_nao_ve_licoes_projecto_privado(self, client):
        """Utilizador não-membro de projecto privado não consegue listar lições."""
        import app as app_module

        _login(client)
        pid = _create_project(client, nome="Privado Licoes")
        client.put(f"/api/projects/{pid}", json={"privado": True})
        client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson(titulo="Secreta"))

        # Criar utilizador sem acesso
        conn = app_module.get_db()
        conn.execute(
            "INSERT OR IGNORE INTO utilizadores (username, password_hash, nome, papel) VALUES (?,?,?,?)",
            ("outsider", app_module.generate_password_hash("pass123"), "Outsider", "membro"),
        )
        conn.commit()
        conn.close()

        client.post("/api/auth/logout")
        client.post("/api/auth/login", json={"username": "outsider", "password": "pass123"})

        r = client.get(f"/api/projects/{pid}/lessons")
        assert r.status_code == 403

    def test_membro_sem_acesso_nao_pode_criar_licao(self, client):
        """Utilizador sem acesso ao projecto privado não pode criar lição."""
        import app as app_module

        _login(client)
        pid = _create_project(client, nome="Privado Criar Licao")
        client.put(f"/api/projects/{pid}", json={"privado": True})

        conn = app_module.get_db()
        conn.execute(
            "INSERT OR IGNORE INTO utilizadores (username, password_hash, nome, papel) VALUES (?,?,?,?)",
            ("outsider2", app_module.generate_password_hash("pass123"), "Outsider2", "membro"),
        )
        conn.commit()
        conn.close()

        client.post("/api/auth/logout")
        client.post("/api/auth/login", json={"username": "outsider2", "password": "pass123"})

        r = client.post(f"/api/projects/{pid}/lessons", json=_valid_lesson())
        assert r.status_code == 403
