# CoopGest — Instruções para Windows

A app corre localmente no seu computador e abre no browser. Não precisa de ligação à Internet após a instalação.

---

## Pré-requisitos

Apenas é necessário **Python 3** instalado. Transfira em:

```
https://www.python.org/downloads/windows/
```

Na instalação, **marque a opção "Add Python to PATH"**.

---

## Primeira execução

1. Descompacte o ficheiro ZIP num local à sua escolha (ex: `C:\CoopGest`).
2. Abra a pasta e faça duplo clique em **`arrancar.bat`**.
3. Na primeira vez, o script instala automaticamente as dependências (aguarde ~1 minuto).
4. O browser abre em `http://127.0.0.1:8000`.

---

## Login inicial

| Campo       | Valor          |
|-------------|----------------|
| Utilizador  | `admin`        |
| Password    | `coopgest2025` |

**Mude a password após o primeiro acesso** em Utilizadores → editar perfil.

---

## Uso diário

Faça duplo clique em **`arrancar.bat`** para iniciar. Mantenha a janela de terminal aberta enquanto usa a app. Para fechar, feche o terminal ou prima `Ctrl+C`.

---

## O que está disponível

| Área | Funcionalidades |
|---|---|
| **Projetos** | Criar, editar, gerir membros e estado |
| **Tarefas** | Kanban, Gantt, calendário, subtarefas, dependências |
| **Impacto / LFA** | Quadro lógico completo (5 colunas), histórico de medições, evidências, Teoria da Mudança |
| **Financeiro** | Orçamento multi-fonte, movimentos, revisões, multi-moeda |
| **Riscos** | Matriz 4×4, planos de mitigação e contingência, revisões |
| **Beneficiários** | Desagregação por género, faixa etária, localização, vulnerabilidade |
| **Lições aprendidas** | Registo por área, fase e tipo (positiva/negativa) |
| **Contratos** | Gestão de procurement: bens, serviços, obras, consultoria |
| **Stakeholders** | Matriz poder/interesse com 4 quadrantes de estratégia |
| **Portfólio** | Dashboard agregado de todos os projetos |
| **Relatórios** | PDF executivo, UE PRAG, USAID, Excel (8 folhas), IATI 2.03 XML |
| **Parceiros** | Gestão de organizações parceiras |
| **Utilizadores** | Gestão de acessos e papéis (admin/gestor/membro) |

---

## Backups

Abra `arrancar.bat` → escolha **opção 2 — Backup local completo**.

O backup é guardado em `backups/coopgest-full-AAAAMMDD-HHMMSS/` e inclui:
- `projetos.db` — toda a informação da app
- `uploads/` — ficheiros e documentos carregados
- `.env` — configurações

**Faça backup antes de cada sessão importante.**

---

## Restauro

Abra `arrancar.bat` → escolha **opção 3 — Restore local completo**.

Introduza o caminho da pasta de backup (ex: `backups\coopgest-full-20260601-140000`).

O sistema guarda automaticamente um backup de segurança antes de fazer o restore.

---

## Configurar alertas por email (opcional)

Crie um ficheiro `.env` na pasta da app com:

```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=1
MAIL_USERNAME=o_seu_email@gmail.com
MAIL_PASSWORD=a_sua_password_de_aplicacao
MAIL_DEFAULT_SENDER=o_seu_email@gmail.com
```

Para Gmail, use uma **password de aplicação** (não a password normal): `Conta Google → Segurança → Verificação em dois passos → Passwords de aplicação`.

---

## Resolução de problemas

| Problema | Solução |
|---|---|
| "Python não encontrado" | Reinstale Python com "Add to PATH" marcado |
| A app não abre no browser | Abra manualmente `http://127.0.0.1:8000` |
| Erro de porta ocupada | Feche outra instância da app antes de arrancar |
| Dados perdidos após atualização | Restaure o backup da sessão anterior (opção 3) |

---

## Atualizar para nova versão

1. Faça backup (opção 2).
2. Substitua os ficheiros da pasta pela nova versão (não substitua `projetos.db`, `uploads/` e `.env`).
3. Arranque normalmente — as migrações de base de dados correm automaticamente.
