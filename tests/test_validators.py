"""
Testes unitários para validação de payloads.
"""
import pytest

from coopgest.validators import (
    validate_project_payload,
    validate_impact_payload,
    validate_skill_payload,
    validate_member_skill_payload,
)
from coopgest.config import (
    VALID_PROJECT_STATUS,
    VALID_IMPACT_CATEGORIES,
    VALID_SKILL_CATEGORIES,
    VALID_SKILL_LEVELS,
)


class TestValidateProjectPayload:
    def test_rejeita_payload_nao_dict(self):
        result, errors = validate_project_payload("texto")
        assert result is None
        assert "payload" in errors

    def test_rejeita_nome_em_falta(self):
        result, errors = validate_project_payload({"data_inicio": "2025-01-01", "data_fim": "2025-12-31"})
        assert errors["nome"] == "Campo obrigatório"

    def test_aceita_payload_valido(self):
        result, errors = validate_project_payload({
            "nome": "Projeto A",
            "descricao": "Desc",
            "objetivos": "Obj",
            "data_inicio": "2025-01-01",
            "data_fim": "2025-12-31",
            "estado": "Em curso",
        })
        assert errors is None
        assert result["nome"] == "Projeto A"
        assert result["estado"] == "Em curso"

    def test_estado_invalido(self):
        result, errors = validate_project_payload({
            "nome": "P",
            "data_inicio": "2025-01-01",
            "data_fim": "2025-12-31",
            "estado": "Inexistente",
        })
        assert errors["estado"] == "Estado inválido"

    def test_data_invalida(self):
        result, errors = validate_project_payload({
            "nome": "P",
            "data_inicio": "2025/01/01",
            "data_fim": "2025-12-31",
        })
        assert "data_inicio" in errors

    def test_default_estado_planeamento(self):
        result, errors = validate_project_payload({
            "nome": "P",
            "data_inicio": "2025-01-01",
            "data_fim": "2025-12-31",
        })
        assert result["estado"] == "Planeamento"

    def test_partial_nao_req_nome(self):
        result, errors = validate_project_payload({"estado": "Concluído"}, partial=True)
        assert errors is None
        assert result["estado"] == "Concluído"


class TestValidateImpactPayload:
    def test_rejeita_categoria_invalida(self):
        result, errors = validate_impact_payload({
            "nome": "ODS 1",
            "valor_atual": 10,
            "meta": 100,
            "categoria": "filosofico",
        })
        assert errors["categoria"] == "Categoria inválida"

    def test_aceita_categorias_validas(self):
        for cat in VALID_IMPACT_CATEGORIES:
            result, errors = validate_impact_payload({
                "nome": "X",
                "valor_atual": 0,
                "meta": 0,
                "categoria": cat,
            })
            assert errors is None, f"categoria {cat} deveria ser válida"

    def test_rejeita_ods_nao_lista(self):
        result, errors = validate_impact_payload({
            "nome": "X",
            "valor_atual": 0,
            "meta": 0,
            "categoria": "social",
            "ods": "1,2,3",
        })
        assert errors["ods"] == "ODS deve ser uma lista de números"

    def test_rejeita_ods_com_texto(self):
        result, errors = validate_impact_payload({
            "nome": "X",
            "valor_atual": 0,
            "meta": 0,
            "categoria": "social",
            "ods": [1, "dois", 3],
        })
        assert errors["ods"] == "ODS deve conter apenas números inteiros"

    def test_converte_ods_inteiros(self):
        result, errors = validate_impact_payload({
            "nome": "X",
            "valor_atual": 0,
            "meta": 0,
            "categoria": "social",
            "ods": [1, 2, 3],
        })
        assert result["ods"] == [1, 2, 3]


class TestValidateSkillPayload:
    def test_aceita_skill_valida(self):
        result, errors = validate_skill_payload({
            "nome": "Gestão",
            "categoria": "gestão",
        })
        assert errors is None
        assert result["nome"] == "Gestão"

    def test_rejeita_categoria_invalida(self):
        result, errors = validate_skill_payload({
            "nome": "X",
            "categoria": "invalida",
        })
        assert errors["categoria"] == "Categoria inválida"

    def test_aceita_categorias_validas(self):
        for cat in VALID_SKILL_CATEGORIES:
            result, errors = validate_skill_payload({"nome": "X", "categoria": cat})
            assert errors is None, f"categoria {cat} deveria ser válida"


class TestValidateMemberSkillPayload:
    def test_rejeita_nivel_fora_de_range(self):
        result, errors = validate_member_skill_payload({
            "competencia_id": 1,
            "nivel": 0,
            "disposto_ensinar": True,
            "quer_aprender": False,
        })
        assert errors["nivel"] == "Nível deve ser entre 1 e 5"

    def test_aceita_niveis_validos(self):
        for nivel in VALID_SKILL_LEVELS:
            result, errors = validate_member_skill_payload({
                "competencia_id": 1,
                "nivel": nivel,
                "disposto_ensinar": True,
                "quer_aprender": False,
            })
            assert errors is None, f"nivel {nivel} deveria ser válido"

    def test_rejeita_campos_em_falta(self):
        result, errors = validate_member_skill_payload({"competencia_id": 1})
        assert "nivel" in errors
        assert "disposto_ensinar" in errors
        assert "quer_aprender" in errors
