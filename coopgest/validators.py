from coopgest.config import (
    VALID_PROJECT_STATUS,
    VALID_IMPACT_CATEGORIES,
    VALID_SKILL_CATEGORIES,
    VALID_SKILL_LEVELS,
    KANBAN_ESTADO_MAP,
    KANBAN_PRIORITY_MAP,
)


def validate_project_payload(payload, partial=False):
    if not isinstance(payload, dict):
        return None, {"payload": "JSON inválido ou em falta"}

    errors = {}
    required_fields = ["nome", "data_inicio", "data_fim"]

    if not partial:
        for field in required_fields:
            value = payload.get(field)
            if value is None or str(value).strip() == "":
                errors[field] = "Campo obrigatório"

    for date_field in ["data_inicio", "data_fim"]:
        if date_field in payload and payload.get(date_field):
            try:
                from datetime import datetime
                datetime.strptime(payload[date_field], "%Y-%m-%d")
            except (TypeError, ValueError):
                errors[date_field] = "Formato inválido. Use YYYY-MM-DD"

    if payload.get("estado") and payload["estado"] not in VALID_PROJECT_STATUS:
        errors["estado"] = "Estado inválido"

    if errors:
        return None, errors

    sanitized = {
        "nome": str(payload.get("nome", "")).strip() if "nome" in payload else None,
        "descricao": str(payload.get("descricao", "")).strip() if "descricao" in payload else None,
        "objetivos": str(payload.get("objetivos", "")).strip() if "objetivos" in payload else None,
        "data_inicio": payload.get("data_inicio"),
        "data_fim": payload.get("data_fim"),
        "estado": payload.get("estado", "Planeamento") if not partial else payload.get("estado"),
    }
    return sanitized, None


def validate_impact_payload(payload, partial=False):
    if not isinstance(payload, dict):
        return None, {"payload": "JSON inválido ou em falta"}

    errors = {}

    if not partial:
        required_fields = ["nome", "valor_atual", "meta", "categoria"]
        for field in required_fields:
            value = payload.get(field)
            if value is None or str(value).strip() == "":
                errors[field] = "Campo obrigatório"

    if "categoria" in payload and payload.get("categoria"):
        if payload["categoria"] not in VALID_IMPACT_CATEGORIES:
            errors["categoria"] = "Categoria inválida"

    for numeric_field in ["valor_atual", "meta"]:
        if numeric_field in payload and payload.get(numeric_field) is not None:
            try:
                float(payload[numeric_field])
            except (TypeError, ValueError):
                errors[numeric_field] = "Valor numérico inválido"

    ods_list = None
    if "ods" in payload and payload.get("ods") is not None:
        if not isinstance(payload["ods"], list):
            errors["ods"] = "ODS deve ser uma lista de números"
        else:
            converted = []
            for item in payload["ods"]:
                try:
                    converted.append(int(item))
                except (TypeError, ValueError):
                    errors["ods"] = "ODS deve conter apenas números inteiros"
                    break
            if "ods" not in errors:
                ods_list = converted

    if errors:
        return None, errors

    sanitized = {
        "nome": str(payload.get("nome", "")).strip() if "nome" in payload else None,
        "valor_atual": float(payload["valor_atual"]) if "valor_atual" in payload and payload.get("valor_atual") is not None else None,
        "meta": float(payload["meta"]) if "meta" in payload and payload.get("meta") is not None else None,
        "unidade": str(payload.get("unidade", "")).strip() if "unidade" in payload else None,
        "categoria": payload.get("categoria"),
        "ods": ods_list if "ods" in payload else None,
    }

    return sanitized, None


def validate_skill_payload(payload, partial=False):
    if not isinstance(payload, dict):
        return None, {"payload": "JSON inválido ou em falta"}

    errors = {}

    if not partial:
        if not payload.get("nome") or str(payload.get("nome")).strip() == "":
            errors["nome"] = "Campo obrigatório"
        if not payload.get("categoria") or str(payload.get("categoria")).strip() == "":
            errors["categoria"] = "Campo obrigatório"

    if payload.get("categoria") and payload["categoria"] not in VALID_SKILL_CATEGORIES:
        errors["categoria"] = "Categoria inválida"

    if errors:
        return None, errors

    sanitized = {
        "nome": str(payload.get("nome", "")).strip() if "nome" in payload else None,
        "categoria": str(payload.get("categoria", "")).strip() if "categoria" in payload else None,
    }
    return sanitized, None


def validate_member_skill_payload(payload):
    if not isinstance(payload, dict):
        return None, {"payload": "JSON inválido ou em falta"}

    errors = {}
    required_fields = ["competencia_id", "nivel", "disposto_ensinar", "quer_aprender"]
    for field in required_fields:
        if field not in payload:
            errors[field] = "Campo obrigatório"

    if "competencia_id" in payload:
        try:
            int(payload["competencia_id"])
        except (TypeError, ValueError):
            errors["competencia_id"] = "ID de competência inválido"

    if "nivel" in payload:
        try:
            nivel = int(payload["nivel"])
            if nivel not in VALID_SKILL_LEVELS:
                errors["nivel"] = "Nível deve ser entre 1 e 5"
        except (TypeError, ValueError):
            errors["nivel"] = "Nível inválido"

    for bool_field in ["disposto_ensinar", "quer_aprender"]:
        if bool_field in payload and not isinstance(payload[bool_field], bool):
            errors[bool_field] = "Valor deve ser booleano"

    if errors:
        return None, errors

    return {
        "competencia_id": int(payload["competencia_id"]),
        "nivel": int(payload["nivel"]),
        "disposto_ensinar": payload["disposto_ensinar"],
        "quer_aprender": payload["quer_aprender"],
    }, None

