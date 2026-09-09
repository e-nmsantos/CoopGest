import json
import mimetypes
import secrets
import ssl
import sys
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from pathlib import Path


BASE = "https://coopgest-production.up.railway.app"
ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]).resolve()

cookies = CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPSHandler(context=ssl._create_unverified_context()),
    urllib.request.HTTPCookieProcessor(cookies),
)


def api(method, path, payload=None):
    body = None
    headers = {}
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    req = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        with opener.open(req, timeout=60) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path}: HTTP {exc.code}: {detail}") from exc


def upload(path, project_id, category):
    boundary = "----CoopGest" + secrets.token_hex(12)
    filename = path.name
    mime = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    chunks = []
    for name, value in (("projeto_id", str(project_id)), ("category", category)):
        chunks.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())
    chunks.append(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
        f"Content-Type: {mime}\r\n\r\n".encode("utf-8")
    )
    chunks.append(path.read_bytes())
    chunks.append(f"\r\n--{boundary}--\r\n".encode())
    req = urllib.request.Request(
        BASE + "/api/documents",
        data=b"".join(chunks),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with opener.open(req, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"upload {filename}: HTTP {exc.code}: {detail}") from exc


TASKS = [
    ("A1.1", "Kick-off e constituição da equipa local", "Diretor Técnico / Coord. Operacional", "2026-09-01", "2026-09-30", "R1,ODS 17"),
    ("A1.2", "Negociação e assinatura de 4 MOUs: MED, MINTTICS, FAS e UAN", "Diretor Técnico", "2026-09-01", "2026-10-31", "R1,ODS 17"),
    ("A1.3", "Linha de base e diagnóstico participativo (n=200)", "Especialista Pedagógico / M&A", "2026-09-01", "2026-09-30", "R1,ODS 4"),
    ("A1.4", "Coordenação bimestral do Comité de Pilotagem", "Coord. Operacional", "2026-09-01", "2027-07-31", "R1,ODS 17"),
    ("A2.1", "Desenvolvimento dos 6 módulos curriculares", "Especialista Pedagógico", "2026-10-01", "2026-11-30", "R2,ODS 4"),
    ("A2.2", "Adaptação linguística, cultural, de género e acessibilidade", "Especialista Pedagógico", "2026-10-01", "2026-11-30", "R2,ODS 4"),
    ("A2.3", "Submissão ao MED e validação técnica interinstitucional", "Diretor Técnico", "2026-11-01", "2026-12-31", "R2,ODS 4"),
    ("A2.4", "Produção dos manuais, guias e instrumentos de avaliação", "Especialista Pedagógico / TIC", "2026-11-01", "2026-12-31", "R2,ODS 4"),
    ("A3.1", "Recrutamento e seleção dos facilitadores (≥40% mulheres)", "Coord. Operacional / FAS / UAN", "2026-10-01", "2026-11-30", "R3,ODS 4"),
    ("A3.2", "ToT: 2 grupos de 30, 40 horas por grupo", "Especialista Pedagógico", "2026-11-01", "2027-01-31", "R3,ODS 4"),
    ("A3.3", "Avaliação final, microaulas e certificação", "Especialista Pedagógico", "2027-01-01", "2027-01-31", "R3,ODS 4"),
    ("A3.4", "Configuração e entrega do laboratório móvel de 60 tablets", "Técnico TIC", "2027-01-01", "2027-01-31", "R3,ODS 9"),
    ("A4.1", "Contratação da empresa TIC e desenho funcional", "Técnico TIC", "2026-09-01", "2026-10-31", "R4,ODS 9"),
    ("A4.2", "Desenvolvimento da PWA e integração dos conteúdos", "Empresa TIC / Técnico TIC", "2026-10-01", "2026-12-31", "R4,ODS 9"),
    ("A4.3", "Testes beta em Viana e Cacuaco com 20 utilizadores", "Técnico TIC / Assistentes de Campo", "2026-12-01", "2026-12-31", "R4,ODS 9"),
    ("A4.4", "Validação, documentação, NAS e configuração dos tablets", "Técnico TIC", "2027-01-01", "2027-01-31", "R4,ODS 9"),
    ("A5.1", "Mobilização, triagem e inscrição dos participantes", "Assistentes de Campo", "2026-12-01", "2027-06-30", "R5,ODS 4"),
    ("A5.2", "50 ciclos × 125 inscritos em 250 subgrupos de 25", "60 Facilitadores / Especialista Pedagógico", "2027-01-01", "2027-07-31", "R5,ODS 4"),
    ("A5.3", "Testes pré/pós e avaliação prática em todas as turmas", "Facilitadores / M&A", "2027-01-01", "2027-07-31", "R5,ODS 4"),
    ("A5.4", "Emissão contínua de certificados (meta ≥5 000; conclusão ≥80%)", "Especialista Pedagógico", "2027-02-01", "2027-07-31", "R5,ODS 4"),
    ("A6.1", "Sistema de M&A, controlo de qualidade e dados desagregados", "Coord. Operacional / Assessor M&A", "2026-09-01", "2027-08-31", "R6,ODS 17"),
    ("A6.2", "Relatórios trimestrais ao doador (M3, M6, M9, M12)", "Diretor Técnico", "2026-11-01", "2027-08-31", "R6,ODS 17"),
    ("A6.3", "Avaliação externa intermédia e final", "Avaliador Externo", "2027-04-01", "2027-08-31", "R6,ODS 17"),
    ("A6.4", "Auditorias financeiras intercalar e final", "Gestora Financeira", "2027-02-01", "2027-08-31", "R6,ODS 17"),
    ("A6.5", "Seguimento a 3 meses de amostra de concluintes", "Assessor M&A", "2027-04-01", "2027-08-31", "R6,ODS 8"),
    ("A6.6", "Comunicação, transparência e visibilidade", "Coord. Operacional", "2026-09-01", "2027-08-31", "R6,ODS 17"),
    ("A7.1", "Negociação do roteiro/MOU de adoção curricular", "Diretor Técnico / MED", "2027-05-01", "2027-08-31", "R7,ODS 4"),
    ("A7.2", "Formação de 2 técnicos do MINTTICS e transferência técnica", "Técnico TIC", "2027-05-01", "2027-07-31", "R7,ODS 9"),
    ("A7.3", "Plano de manutenção e licenciamento (Apache 2.0 + CC BY-SA 4.0)", "Técnico TIC / MINTTICS", "2027-06-01", "2027-08-31", "R7,ODS 9"),
    ("A7.4", "Evento final, auditoria e relatório de encerramento", "Diretor Técnico / Gestora Financeira", "2027-08-01", "2027-08-31", "R7,ODS 17"),
]

MILESTONES = [
    ("M1", "Equipa mobilizada e linha de base concluída", "2026-09-30"),
    ("M2", "4 MOUs e plano operacional formalizados", "2026-10-31"),
    ("M3", "Currículo e materiais tecnicamente validados", "2026-12-31"),
    ("M4", "60 facilitadores certificados", "2027-01-31"),
    ("M5", "Plataforma e laboratório móvel operacionais", "2027-01-31"),
    ("M6", "Ponto intermédio: 25 ciclos e ≥2 500 certificados", "2027-04-30"),
    ("M7", "Meta formativa: 50 ciclos e ≥5 000 certificados", "2027-07-31"),
    ("M8", "Sustentabilidade e encerramento formalizados", "2027-08-31"),
]

STAKEHOLDERS = [
    ("MED — Ministério da Educação", "Governo", "Validação técnica e adoção curricular", "Alto", "Alto", "Neutro"),
    ("MINTTICS", "Governo", "Co-certificação, plataforma e manutenção", "Alto", "Alto", "Neutro"),
    ("FAS", "Instituição pública", "Mobilização inclusiva e continuidade comunitária", "Alto", "Alto", "Apoiante"),
    ("UAN — Universidade Agostinho Neto", "Universidade", "Recrutamento, espaços e rede de alumni", "Alto", "Alto", "Apoiante"),
    ("CEPCEP/UCP", "Proponente", "Qualidade, gestão e prestação de contas", "Alto", "Alto", "Apoiante"),
    ("Comissão Europeia — DG INTPA", "Financiador", "Resultados, elegibilidade e transparência", "Alto", "Alto", "Neutro"),
    ("60 facilitadores locais", "Implementadores", "Certificação, experiência e oportunidades", "Alto", "Médio", "Neutro"),
    ("6 250 participantes inscritos", "Beneficiários", "Competências úteis, acesso e certificado", "Alto", "Baixo", "Neutro"),
    ("Escolas e centros comunitários", "Locais de execução", "Espaços e benefícios locais", "Alto", "Médio", "Neutro"),
    ("Empresa TIC angolana", "Fornecedor", "Contrato e produto funcional", "Alto", "Médio", "Neutro"),
    ("Associações de mulheres, juventude e pessoas com deficiência", "Sociedade civil", "Inclusão e acessibilidade", "Alto", "Baixo", "Neutro"),
    ("Media e empresas tecnológicas", "Setor privado", "Visibilidade e apoio pós-projeto", "Médio", "Médio", "Neutro"),
]

BUDGET = [
    ("Recursos Humanos", 200000, "Equipa local e sede; inclui 23 600 USD de ajudas de custo"),
    ("Viagens", 20000, "Voos internacionais e transportes locais contratados"),
    ("Equipamento e Materiais", 75000, "60 tablets, 2 NAS, materiais e kits"),
    ("Escritório do Projeto", 12000, "Operação local da equipa em Luanda"),
    ("Outras Despesas e Serviços", 99000, "Ciclos formativos, avaliações, auditorias, comunicação e certificados"),
    ("Outros Custos Diretos", 43000, "Plataforma e apoio institucional"),
    ("Custos indiretos (7%)", 31430, "Limite máximo de 7% dos custos diretos elegíveis"),
    ("Reserva de contingência", 19570, "Reserva sujeita a aprovação"),
]

TEAM = [
    ("coordenacao_operacional", "Coordenador(a) Operacional", "gestor"),
    ("especialista_pedagogico", "Especialista Pedagógico(a)", "membro"),
    ("tecnico_tic", "Técnico(a) TIC", "membro"),
    ("assistentes_campo", "Assistentes de Campo (6)", "membro"),
    ("assistente_financeiro", "Assistente Administrativo-Financeiro(a)", "membro"),
    ("logistica", "Logístico(a) / Motorista", "membro"),
    ("direcao_tecnica", "Diretor(a) Técnico(a) UCP", "gestor"),
    ("gestao_financeira", "Gestora Financeira UCP", "membro"),
    ("assessoria_ma", "Assessor(a) M&A UCP", "membro"),
]


def main():
    api("GET", "/api/auth/me")
    api("POST", "/api/system/reset-data", {})
    template = json.loads((ROOT / "template_coopgest_echo_angola.json").read_text(encoding="utf-8"))
    template["projeto"].update({
        "nome": "Projeto ECHO Angola — Literacia em IA para o Desenvolvimento Nacional",
        "localizacao": "Luanda, Angola",
        "entidade_proponente": "CEPCEP / Universidade Católica Portuguesa",
        "ods": [4, 8, 9, 17],
    })
    template["stakeholders"] = []
    template["milestones"] = []
    template["orcamento"] = []
    created = api("POST", "/api/projects/import-template", template)
    pid = created["projeto_id"]

    for category, amount, description in BUDGET:
        api("POST", f"/api/projects/{pid}/budget", {"tipo": "Previsto", "categoria": category, "descricao": description, "valor_previsto": amount})
    api("POST", f"/api/projects/{pid}/funding", {
        "nome": "Comissão Europeia — DG INTPA (financiamento simulado)", "tipo": "Fundo Europeu",
        "valor_aprovado": 500000, "valor_executado": 0, "moeda": "USD",
        "data_inicio": "2026-09-01", "data_fim": "2027-08-31", "referencia": "Projeto académico simulado",
    })

    for code, title, owner, start, end, tags in TASKS:
        api("POST", f"/api/projects/{pid}/tasks", {"title": f"{code} — {title}", "description": "Atividade do Anexo I — Cronograma ECHO Angola", "responsavel": owner, "data_inicio": start, "dueDate": end, "priority": "medium", "status": "todo", "tags": tags.split(",")})
    for code, description, date in MILESTONES:
        api("POST", f"/api/projects/{pid}/milestones", {"nome": f"{code} — {description}", "descricao": description, "data_prevista": date})
    for name, organisation, role, interest, influence, position in STAKEHOLDERS:
        api("POST", f"/api/projects/{pid}/stakeholders", {"nome": name, "organizacao": organisation, "papel": role, "interesse": interest, "influencia": influence, "posicao": position, "estrategia": "Envolvimento conforme Anexo V", "notas": "Fonte: Anexo V — Matriz de Stakeholders"})

    password = secrets.token_urlsafe(24)
    for username, name, project_role in TEAM:
        api("POST", "/api/auth/users", {"username": username, "password": password, "nome": name, "papel": "membro"})
    users = api("GET", "/api/auth/users")
    by_username = {u["username"]: u for u in users}
    for username, _, project_role in TEAM:
        api("POST", f"/api/projects/{pid}/team", {"user_id": by_username[username]["id"], "papel": project_role})

    categories = {
        "Anexo_I_Cronograma_ECHO_Angola.xlsx": "Planeamento",
        "Anexo_II_Orcamento_PRAG_ECHO_Angola.xlsx": "Financeiro",
        "Anexo_III_Analise_Causal_e_Lógica_de_Intervenção_ECHO_Angola.pdf": "Planeamento",
        "Anexo_IV_Matriz_Avaliacao_ECHO_Angola.xlsx": "Monitorização",
        "Anexo_V_Matriz_Stakeholders_ECHO_Angola.xlsx": "Stakeholders",
        "Anexo_VI_Quadro_Logico_ECHO_Angola.xlsx": "Monitorização",
        "Anexo_VII_Declaracao_Utilizacao_IA.pdf": "Outros",
        "Anexo_VIII_Nota_Tecnica_CoopGest.pdf": "Outros",
        "Projeto_ECHO_Angola.pdf": "Relatórios",
    }
    for filename, category in categories.items():
        upload(SOURCE / filename, pid, category)

    project = api("GET", f"/api/projects/{pid}")
    checks = {
        "project_id": pid,
        "project_name": project.get("nome"),
        "tasks": len(api("GET", f"/api/projects/{pid}/tasks")),
        "milestones": len(api("GET", f"/api/projects/{pid}/milestones")),
        "stakeholders": len(api("GET", f"/api/projects/{pid}/stakeholders")),
        "team": len(api("GET", f"/api/projects/{pid}/team")),
        "documents": len(api("GET", f"/api/documents?projeto_id={pid}")),
        "budget_total": sum(float(x.get("valor_previsto") or 0) for x in project.get("orcamento", [])),
        "funding_total": sum(float(x.get("valor_aprovado") or 0) for x in api("GET", f"/api/projects/{pid}/funding")),
    }
    print(json.dumps(checks, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
