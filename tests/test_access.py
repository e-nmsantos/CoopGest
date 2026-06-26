"""
Testes unitários para helpers de acesso e RBAC.
"""
import pytest

from coopgest.access import project_role_allows, initials_from_name


class TestProjectRoleAllows:
    def test_admin_acessa_tudo(self):
        assert project_role_allows("admin", "gestor") is True
        assert project_role_allows("admin", "membro") is True
        assert project_role_allows("admin", "leitor") is True

    def test_gestor_acessa_gestor_e_leitor(self):
        assert project_role_allows("gestor", "gestor") is True
        assert project_role_allows("gestor", "membro") is True
        assert project_role_allows("gestor", "leitor") is True

    def test_membro_nao_acessa_gestor(self):
        assert project_role_allows("membro", "gestor") is False
        assert project_role_allows("membro", "membro") is True
        assert project_role_allows("membro", "leitor") is True

    def test_leitor_so_acessa_leitor(self):
        assert project_role_allows("leitor", "leitor") is True
        assert project_role_allows("leitor", "membro") is False

    def test_role_desconhecida_nao_acessa(self):
        assert project_role_allows("desconhecida", "leitor") is False


class TestInitialsFromName:
    def test_nome_completo(self):
        assert initials_from_name("Maria Silva") == "MS"

    def test_nome_unico(self):
        assert initials_from_name("Maria") == "M"

    def test_nome_vazio(self):
        assert initials_from_name("") == "??"

    def test_multiplos_espacos(self):
        assert initials_from_name("Ana  Beatriz  Costa") == "AB"
