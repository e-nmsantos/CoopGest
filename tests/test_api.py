"""
Testes básicos para a API CoopGest.
Executar com: pytest tests/ -v
"""
import os
import tempfile
import pytest
import sys
import io

# Garantir que o módulo app está acessível
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

os.environ['SECRET_KEY'] = 'test-secret-key'
os.environ['FLASK_ENV'] = 'development'

import app as app_module


@pytest.fixture
def client():
    """Cliente de teste com base de dados temporária."""
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    app_module.DB_PATH = db_path
    import coopgest.config
    coopgest.config.DB_PATH = db_path
    app_module.app.config['TESTING'] = True
    app_module.app.config['RATELIMIT_ENABLED'] = False
    app_module.app.config['WTF_CSRF_ENABLED'] = False
    if getattr(app_module, '_limiter', None):
        app_module._limiter.reset()

    with app_module.app.test_client() as client:
        with app_module.app.app_context():
            app_module.init_db()
        yield client

    os.close(db_fd)
    os.unlink(db_path)


def login(client, username='admin', password='coopgest2025'):
    return client.post('/api/auth/login', json={'username': username, 'password': password})


def project_payload(**overrides):
    payload = {
        'nome': 'Projeto Teste',
        'estado': 'Planeamento',
        'data_inicio': '2025-01-01',
        'data_fim': '2025-12-31',
    }
    payload.update(overrides)
    return payload


# ─── Auth ─────────────────────────────────────────────────────────────────────

class TestAuth:
    def test_login_sucesso(self, client):
        r = login(client)
        assert r.status_code == 200
        data = r.get_json()
        assert data['username'] == 'admin'
        assert data['papel'] == 'admin'

    def test_login_credenciais_invalidas(self, client):
        r = client.post('/api/auth/login', json={'username': 'admin', 'password': 'errada'})
        assert r.status_code == 401

    def test_login_campos_em_falta(self, client):
        r = client.post('/api/auth/login', json={'username': 'admin'})
        assert r.status_code == 400

    def test_me_sem_sessao(self, client):
        r = client.get('/api/auth/me')
        assert r.status_code == 401

    def test_me_com_sessao(self, client):
        login(client)
        r = client.get('/api/auth/me')
        assert r.status_code == 200
        assert r.get_json()['username'] == 'admin'

    def test_logout(self, client):
        login(client)
        r = client.post('/api/auth/logout')
        assert r.status_code == 200
        # Após logout, /me deve retornar 401
        r2 = client.get('/api/auth/me')
        assert r2.status_code == 401

    def test_update_perfil_nome(self, client):
        login(client)
        r = client.patch('/api/auth/me', json={'nome': 'Admin Atualizado'})
        assert r.status_code == 200
        assert r.get_json()['nome'] == 'Admin Atualizado'

    def test_update_perfil_password_errada(self, client):
        login(client)
        r = client.patch('/api/auth/me', json={'password': 'nova1234', 'password_atual': 'errada'})
        assert r.status_code == 401

    def test_forgot_password(self, client):
        r = client.post('/api/auth/forgot-password', json={'username': 'admin'})
        assert r.status_code == 200
        data = r.get_json()
        assert 'message' in data

    def test_reset_password_token_invalido(self, client):
        r = client.post('/api/auth/reset-password', json={'token': 'invalido', 'password': 'nova123'})
        assert r.status_code == 400


# ─── Projetos ─────────────────────────────────────────────────────────────────

class TestProjects:
    def test_listar_sem_autenticacao(self, client):
        r = client.get('/api/projects')
        assert r.status_code == 401

    def test_criar_e_listar(self, client):
        login(client)
        r = client.post('/api/projects', json={
            'nome': 'Projeto Teste',
            'descricao': 'Descrição',
            'estado': 'Planeamento',
            'data_inicio': '2025-01-01',
            'data_fim': '2025-12-31',
        })
        assert r.status_code == 201
        assert r.get_json()['nome'] == 'Projeto Teste'

        r2 = client.get('/api/projects')
        assert r2.status_code == 200
        projetos = r2.get_json()
        assert len(projetos) >= 1

    def test_criar_sem_nome(self, client):
        login(client)
        r = client.post('/api/projects', json={'descricao': 'Sem nome'})
        assert r.status_code == 400

    def test_obter_projeto(self, client):
        login(client)
        r = client.post('/api/projects', json=project_payload(nome='P1', estado='Em curso'))
        pid = r.get_json()['id']
        r2 = client.get(f'/api/projects/{pid}')
        assert r2.status_code == 200
        assert r2.get_json()['projeto']['nome'] == 'P1'

    def test_atualizar_projeto(self, client):
        login(client)
        r = client.post('/api/projects', json=project_payload(nome='P2', estado='Em curso'))
        pid = r.get_json()['id']
        r2 = client.put(f'/api/projects/{pid}', json={'nome': 'P2 Atualizado'})
        assert r2.status_code == 200

    def test_arquivar_projeto(self, client):
        login(client)
        r = client.post('/api/projects', json=project_payload(nome='P3', estado='Em curso'))
        pid = r.get_json()['id']
        r2 = client.post(f'/api/projects/{pid}/archive')
        assert r2.status_code == 200
        assert r2.get_json()['arquivado'] == 1

    def test_projeto_nao_encontrado(self, client):
        login(client)
        r = client.get('/api/projects/99999')
        assert r.status_code == 404

    def test_paginacao(self, client):
        login(client)
        for i in range(5):
            client.post('/api/projects', json=project_payload(nome=f'Projeto {i}', estado='Em curso'))
        r = client.get('/api/projects?page=1&per_page=3')
        assert r.status_code == 200
        data = r.get_json()
        assert 'items' in data
        assert 'total' in data
        assert len(data['items']) <= 3


# ─── Tarefas ──────────────────────────────────────────────────────────────────

class TestTasks:
    def _criar_projeto(self, client):
        r = client.post('/api/projects', json=project_payload(nome='Proj', estado='Em curso'))
        return r.get_json()['id']

    def test_criar_tarefa(self, client):
        login(client)
        pid = self._criar_projeto(client)
        r = client.post(f'/api/projects/{pid}/tasks', json={
            'title': 'Tarefa 1', 'status': 'todo', 'priority': 'medium'
        })
        assert r.status_code == 201

    def test_mover_tarefa(self, client):
        login(client)
        pid = self._criar_projeto(client)
        r = client.post(f'/api/projects/{pid}/tasks', json={'title': 'T1', 'status': 'todo'})
        tid = r.get_json()['id']
        r2 = client.patch(f'/api/tasks/{tid}', json={'status': 'done'})
        assert r2.status_code == 200

    def test_eliminar_tarefa(self, client):
        login(client)
        pid = self._criar_projeto(client)
        r = client.post(f'/api/projects/{pid}/tasks', json={'title': 'T2', 'status': 'todo'})
        tid = r.get_json()['id']
        r2 = client.delete(f'/api/tasks/{tid}')
        assert r2.status_code == 200


# ─── Parceiros ────────────────────────────────────────────────────────────────

class TestPartners:
    def test_criar_parceiro(self, client):
        login(client)
        r = client.post('/api/partners', json={'name': 'Parceiro Teste', 'type': 'ONG'})
        assert r.status_code == 201
        assert r.get_json()['name'] == 'Parceiro Teste'

    def test_listar_parceiros(self, client):
        login(client)
        client.post('/api/partners', json={'name': 'P1'})
        r = client.get('/api/partners')
        assert r.status_code == 200
        assert len(r.get_json()) >= 1

    def test_eliminar_parceiro(self, client):
        login(client)
        r = client.post('/api/partners', json={'name': 'P Del'})
        pid = r.get_json()['id']
        r2 = client.delete(f'/api/partners/{pid}')
        assert r2.status_code == 200


# ─── Segurança ────────────────────────────────────────────────────────────────

class TestFinances:
    def test_movimento_com_anexo_descarrega_no_orcamento(self, client):
        login(client)
        project = client.post('/api/projects', json=project_payload(nome='Financas', estado='Em curso'))
        pid = project.get_json()['id']

        budget = client.post(f'/api/projects/{pid}/budget', json={
            'tipo': 'Despesa',
            'categoria': 'Equipamentos',
            'descricao': 'Material informatico',
            'valor_previsto': 1000,
            'valor_real': 0,
        })
        assert budget.status_code == 201

        movement = client.post(
            '/api/finances/transactions',
            data={
                'projeto_id': str(pid),
                'tipo': 'Despesa',
                'categoria': ' equipamentos ',
                'descricao': 'Compra de portatil',
                'valor': '250.50',
                'data_movimento': '2026-06-15',
                'anexo': (io.BytesIO(b'%PDF-1.4 teste'), 'fatura.pdf'),
            },
            content_type='multipart/form-data',
        )
        assert movement.status_code == 201
        movement_data = movement.get_json()
        assert movement_data['anexo_nome'] == 'fatura.pdf'
        assert movement_data['anexo_url'].endswith('/attachment')

        attachment = client.get(movement_data['anexo_url'])
        assert attachment.status_code == 200
        assert attachment.data.startswith(b'%PDF')

        detail = client.get(f'/api/projects/{pid}')
        assert detail.status_code == 200
        item = detail.get_json()['orcamento'][0]
        assert item['categoria'] == 'Equipamentos'
        assert item['valor_real'] == 250.50
        assert item['valor_real_origem'] == 'movimentos_financeiros'

        deleted = client.delete(f"/api/finances/transactions/{movement_data['id']}")
        assert deleted.status_code == 200

    def test_editar_movimento_atualiza_execucao_orcamental(self, client):
        login(client)
        project = client.post('/api/projects', json=project_payload(nome='Edicao Financeira', estado='Em curso'))
        pid = project.get_json()['id']
        client.post(f'/api/projects/{pid}/budget', json={
            'tipo': 'Despesa',
            'categoria': 'Transporte',
            'descricao': 'Viaturas',
            'valor_previsto': 500,
            'valor_real': 0,
        })
        movement = client.post('/api/finances/transactions', data={
            'projeto_id': str(pid),
            'tipo': 'Despesa',
            'categoria': 'Transporte',
            'descricao': 'Aluguer',
            'valor': '100',
            'data_movimento': '2026-06-15',
        })
        assert movement.status_code == 201
        movement_id = movement.get_json()['id']

        updated = client.put(f'/api/finances/transactions/{movement_id}', data={
            'valor': '175',
            'descricao': 'Aluguer atualizado',
        })
        assert updated.status_code == 200
        assert updated.get_json()['valor'] == 175

        detail = client.get(f'/api/projects/{pid}')
        item = detail.get_json()['orcamento'][0]
        assert item['valor_real'] == 175


class TestSecurity:
    def test_endpoints_protegidos(self, client):
        """Todos os endpoints de dados devem exigir autenticação."""
        endpoints = [
            ('GET', '/api/projects'),
            ('GET', '/api/partners'),
            ('GET', '/api/votacoes'),
            ('GET', '/api/notifications'),
            ('GET', '/api/audit'),
        ]
        for method, url in endpoints:
            r = client.open(url, method=method)
            assert r.status_code == 401, f"{method} {url} deveria retornar 401, obteve {r.status_code}"

    def test_admin_only_users(self, client):
        """Endpoint de utilizadores só para admin."""
        login(client)
        r = client.get('/api/auth/users')
        assert r.status_code == 200  # admin pode ver

    def test_password_reset_fluxo_completo(self, client):
        """Fluxo completo: forgot → reset → login com nova password."""
        # 1. Pedir reset
        r = client.post('/api/auth/forgot-password', json={'username': 'admin'})
        token = r.get_json().get('token')
        assert token is not None, "Modo dev deve devolver token"

        # 2. Usar token para redefinir
        r2 = client.post('/api/auth/reset-password', json={'token': token, 'password': 'novaPass123'})
        assert r2.status_code == 200

        # 3. Login com nova password
        r3 = client.post('/api/auth/login', json={'username': 'admin', 'password': 'novaPass123'})
        assert r3.status_code == 200

        # 4. Login com password antiga deve falhar
        r4 = client.post('/api/auth/login', json={'username': 'admin', 'password': 'coopgest2025'})
        assert r4.status_code == 401

    def test_forgot_password_nao_expoe_token_fora_de_testing(self, client):
        old_testing = app_module.app.config['TESTING']
        app_module.app.config['TESTING'] = False
        try:
            r = client.post('/api/auth/forgot-password', json={'username': 'admin'})
            assert r.status_code == 200
            assert 'token' not in r.get_json()
        finally:
            app_module.app.config['TESTING'] = old_testing

    def test_rotas_legacy_desativadas_por_defeito(self, client):
        r = client.get('/legacy')
        assert r.status_code == 404

    def test_projeto_privado_escondido_de_nao_membro(self, client):
        login(client)
        r = client.post('/api/projects', json=project_payload(nome='Privado'))
        pid = r.get_json()['id']
        client.put(f'/api/projects/{pid}', json={'privado': True})

        conn = app_module.get_db()
        conn.execute(
            'INSERT INTO utilizadores (username, password_hash, nome, papel) VALUES (?, ?, ?, ?)',
            ('membro', app_module.generate_password_hash('senha123'), 'Membro', 'membro')
        )
        conn.commit()
        conn.close()

        client.post('/api/auth/logout')
        login(client, username='membro', password='senha123')

        r_list = client.get('/api/projects')
        assert all(project['id'] != pid for project in r_list.get_json())

        r_detail = client.get(f'/api/projects/{pid}')
        assert r_detail.status_code == 403

    def test_upload_rejeita_extensao_nao_permitida(self, client):
        login(client)
        r = client.post('/api/projects', json=project_payload(nome='Docs'))
        pid = r.get_json()['id']

        data = {
            'projeto_id': str(pid),
            'file': (io.BytesIO(b'conteudo'), 'script.exe'),
        }
        upload = client.post('/api/documents', data=data, content_type='multipart/form-data')
        assert upload.status_code == 400
