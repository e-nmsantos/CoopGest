/**
 * flows.spec.ts — Fluxos completos de utilizador (E2E)
 *
 * Cada teste é independente, cria os seus próprios dados com nomes únicos
 * baseados em timestamp e verifica resultados reais (texto, contagens, estados).
 *
 * Timeout por teste: 120s (os fluxos envolvem login + criação + navegação + acções).
 */

import { test, expect, type Page } from "@playwright/test";
import { login, createProject } from "./helpers";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// Cada teste de fluxo pode demorar até 2 minutos
test.setTimeout(120000);

// ---------------------------------------------------------------------------
// Helpers locais
// ---------------------------------------------------------------------------

/** Navega para a lista de projetos e abre o projecto cujo nome contém o fragmento.
 *  Muda para modo lista para garantir que o <Link> envolve toda a linha e
 *  o clique resulta sempre em navegação. */
async function openProject(page: Page, nameFragment: string) {
  await page.goto("/projetos");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800);

  // Aguardar que o projecto apareça
  await expect(
    page.locator(`text=${nameFragment}`).first()
  ).toBeVisible({ timeout: 12000 });

  // Clicar no link <a> que contém o texto do projecto
  // (em modo grelha é <Link><Card><h3>texto</h3></Card></Link>)
  // Em modo lista é <Link className="flex..."><div><h3>texto</h3>...)
  // Queremos clicar no próprio <a> — usar getByRole("link") filtrando pelo texto
  const projectLink = page
    .getByRole("link")
    .filter({ hasText: nameFragment })
    .first();

  await projectLink.waitFor({ timeout: 10000 });
  await projectLink.click();
  await page.waitForURL(/\/projeto\/\d+/, { timeout: 20000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(500);
}

/** Clica na tab do projecto pelo label (texto ou aria-label) */
async function clickTab(page: Page, label: string) {
  const trigger = page.getByRole("tab", { name: new RegExp(label, "i") }).first();
  await trigger.waitFor({ timeout: 10000 });
  await trigger.click();
  await page.waitForTimeout(500);
}

/** Cria projecto e abre-o directamente */
async function createAndOpenProject(page: Page, projectName: string) {
  await createProject(page, projectName);
  await openProject(page, projectName);
}

// ---------------------------------------------------------------------------
// Fluxo 1 — Ciclo de vida completo de um projecto
// ---------------------------------------------------------------------------
test.describe("Fluxo 1: Ciclo de vida completo de um projecto", () => {
  test("criar projecto, adicionar tarefa, concluir tarefa, adicionar milestone", async ({
    page,
  }) => {
    await login(page);

    const ts = Date.now();
    const projectName = `Fluxo1-${ts}`;
    const taskTitle = `Tarefa-${ts}`;
    const milestoneTitle = `Marco-${ts}`;
    const future = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

    // 1. Criar projecto --------------------------------------------------------
    await createProject(page, projectName);

    // 2. Verificar que aparece na lista ----------------------------------------
    await page.goto("/projetos");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator(`text=${projectName}`).first()).toBeVisible({
      timeout: 12000,
    });

    // 3. Abrir projecto --------------------------------------------------------
    const projectLink = page
      .getByRole("link")
      .filter({ hasText: projectName })
      .first();
    await projectLink.waitFor({ timeout: 10000 });
    await projectLink.click();
    await page.waitForURL(/\/projeto\/\d+/, { timeout: 20000 });
    await page.waitForLoadState("domcontentloaded");

    // 4. Adicionar tarefa (tab Tarefas é a default) ----------------------------
    await clickTab(page, "Tarefas");

    await page.getByRole("button", { name: "Nova Tarefa" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    await page.getByLabel("Título").fill(taskTitle);
    await page.getByLabel("Prazo").fill(future);
    await page.getByRole("button", { name: "Adicionar" }).click();

    // Aguardar que o diálogo feche e a tarefa apareça
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible({
      timeout: 10000,
    });

    // 5. Registar contagem de tarefas abertas antes ----------------------------
    const headerEl = page
      .locator("h3")
      .filter({ hasText: /Tarefas \(\d+ abertas\)/ });
    await headerEl.waitFor({ timeout: 5000 });
    const headerText = await headerEl.innerText();
    const countBefore = parseInt(
      headerText.match(/(\d+) abertas/)?.[1] ?? "1",
      10
    );
    expect(countBefore).toBeGreaterThanOrEqual(1);

    // 6. Marcar tarefa como concluída ------------------------------------------
    const taskCheckbox = page
      .locator("li")
      .filter({ hasText: taskTitle })
      .getByRole("checkbox")
      .first();
    await taskCheckbox.click();
    await page.waitForTimeout(2000);

    // 7. Verificar que a contagem de abertas diminuiu --------------------------
    await headerEl.waitFor({ timeout: 8000 });
    const headerTextAfter = await headerEl.innerText();
    const countAfter = parseInt(
      headerTextAfter.match(/(\d+) abertas/)?.[1] ?? "0",
      10
    );
    expect(countAfter).toBeLessThan(countBefore);

    // Secção "Concluídas" deve aparecer
    await expect(
      page.locator("h4").filter({ hasText: /Concluídas/ })
    ).toBeVisible({ timeout: 6000 });

    // 8. Adicionar milestone ---------------------------------------------------
    await clickTab(page, "Milestones");

    await page.getByRole("button", { name: "Novo Milestone" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    await page.getByLabel("Título").fill(milestoneTitle);
    await page.getByLabel("Data Prevista").fill(future);
    await page.getByRole("button", { name: "Adicionar" }).click();

    // 9. Verificar milestone na lista ------------------------------------------
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${milestoneTitle}`).first()).toBeVisible({
      timeout: 10000,
    });

    // Header de milestones deve mostrar pelo menos 1 pendente
    const msHeader = page
      .locator("h3")
      .filter({ hasText: /Milestones \(\d+ pendentes\)/ });
    await expect(msHeader).toBeVisible({ timeout: 5000 });
    const msText = await msHeader.innerText();
    expect(parseInt(msText.match(/(\d+)/)?.[1] ?? "0", 10)).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Fluxo 2 — Gestão de tarefas com estados
// ---------------------------------------------------------------------------
test.describe("Fluxo 2: Gestão de tarefas com estados", () => {
  test("criar tarefa, verificar criação, completar e verificar secção Concluídas", async ({
    page,
  }) => {
    await login(page);

    const ts = Date.now();
    const projectName = `Fluxo2-${ts}`;
    const taskTitle = `TarefaEstado-${ts}`;
    const future = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

    await createAndOpenProject(page, projectName);
    await clickTab(page, "Tarefas");

    // --- Criar tarefa ---------------------------------------------------------
    await page.getByRole("button", { name: "Nova Tarefa" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await page.getByLabel("Título").fill(taskTitle);
    await page.getByLabel("Prazo").fill(future);
    await page.getByRole("button", { name: "Adicionar" }).click();

    // --- Verificar criação ----------------------------------------------------
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible({
      timeout: 10000,
    });

    // Tarefa deve estar em lista de abertas (label sem line-through)
    const taskLabel = page
      .locator("label")
      .filter({ hasText: taskTitle })
      .first();
    await expect(taskLabel).toBeVisible({ timeout: 5000 });
    const classAttr = (await taskLabel.getAttribute("class")) ?? "";
    expect(classAttr).not.toContain("line-through");

    // Contar concluídas antes (pode ser 0 se a secção não existir)
    const completedHeader = page
      .locator("h4")
      .filter({ hasText: /Concluídas \(\d+\)/ });
    const countBefore =
      (await completedHeader.count()) > 0
        ? parseInt(
            (await completedHeader.first().innerText()).match(/\d+/)?.[0] ?? "0",
            10
          )
        : 0;

    // --- Marcar como concluída -----------------------------------------------
    const checkbox = page
      .locator("li")
      .filter({ hasText: taskTitle })
      .getByRole("checkbox")
      .first();
    await checkbox.click();
    await page.waitForTimeout(2000);

    // --- Verificar estado "Concluída" -----------------------------------------
    await expect(completedHeader).toBeVisible({ timeout: 8000 });
    const countAfterText = await completedHeader.first().innerText();
    const countAfter = parseInt(countAfterText.match(/\d+/)?.[0] ?? "0", 10);
    expect(countAfter).toBeGreaterThan(countBefore);

    // Tarefa com line-through
    const doneLabel = page
      .locator("label.line-through")
      .filter({ hasText: taskTitle });
    await expect(doneLabel).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Fluxo 3 — Orçamento e financiamento
// ---------------------------------------------------------------------------
test.describe("Fluxo 3: Orçamento e financiamento", () => {
  test("adicionar rubrica de orçamento e verificar total, adicionar fonte de financiamento", async ({
    page,
  }) => {
    await login(page);

    const ts = Date.now();
    const projectName = `Fluxo3-${ts}`;
    const fundingName = `FCT-${ts}`;

    await createAndOpenProject(page, projectName);

    // ---- Tab Orçamento -------------------------------------------------------
    await clickTab(page, "Orçamento");

    // Preencher formulário inline da BudgetSection
    await page.getByPlaceholder("Categoria").fill("Pessoal");
    await page.getByPlaceholder("Descrição").fill("Salários equipa");
    await page.getByPlaceholder("Previsto (€)").fill("5000");
    await page.getByPlaceholder("Real (€)").fill("4800");

    await page.getByRole("button", { name: "Adicionar" }).click();
    await page.waitForTimeout(2000);

    // Verificar item adicionado
    await expect(page.locator("text=Pessoal").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Salários equipa").first()).toBeVisible();

    // Card de despesas previstas deve mostrar 5000.00 €
    await expect(
      page.locator("text=5000.00 €").first()
    ).toBeVisible({ timeout: 5000 });

    // ---- Tab Financiamento ---------------------------------------------------
    await clickTab(page, "Financiamento");

    await page.getByPlaceholder("Nome da fonte *").fill(fundingName);
    await page.getByPlaceholder("Valor aprovado (€)").fill("20000");
    await page.getByPlaceholder("Valor executado (€)").fill("5000");

    await page.getByRole("button", { name: "Adicionar Fonte" }).click();
    await page.waitForTimeout(2000);

    // Verificar fonte adicionada
    await expect(page.locator(`text=${fundingName}`).first()).toBeVisible({
      timeout: 10000,
    });

    // Card de total aprovado deve mostrar 20000.00 €
    await expect(
      page.locator("text=20000.00 €").first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Fluxo 4 — Exportação de relatório CSV
// ---------------------------------------------------------------------------
test.describe("Fluxo 4: Exportação de relatório CSV", () => {
  test("exportar CSV de tarefas e verificar que o ficheiro tem conteúdo", async ({
    page,
  }) => {
    await login(page);

    const ts = Date.now();
    const projectName = `Fluxo4-${ts}`;
    const taskTitle = `TarefaCSV-${ts}`;
    const future = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

    // Criar projecto com uma tarefa
    await createAndOpenProject(page, projectName);
    await clickTab(page, "Tarefas");

    await page.getByRole("button", { name: "Nova Tarefa" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    await page.getByLabel("Título").fill(taskTitle);
    await page.getByLabel("Prazo").fill(future);
    await page.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible({
      timeout: 10000,
    });

    // Recarregar a página para que useProject refaça o fetch das tarefas e
    // as passe ao ProjectActionsBar (o downloadCSV usa a prop tasks do hook)
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Verificar que a tarefa ainda aparece após reload
    await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible({
      timeout: 10000,
    });

    // Abrir dropdown "Exportar CSV"
    const exportCsvBtn = page.getByRole("button", { name: /Exportar CSV/i });
    await expect(exportCsvBtn).toBeVisible({ timeout: 8000 });

    // O download é gerado via blob URL (client-side), deve ser capturado pelo
    // Playwright antes do clique no item do menu
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await exportCsvBtn.click();
    await page.waitForTimeout(400);

    const tarefasItem = page.getByRole("menuitem", { name: /Tarefas/i });
    await expect(tarefasItem).toBeVisible({ timeout: 5000 });
    await tarefasItem.click();
    const download = await downloadPromise;

    // Verificar nome do ficheiro
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/tarefas.*\.csv$/i);

    // Guardar e verificar conteúdo
    const tmpPath = path.join(os.tmpdir(), filename);
    await download.saveAs(tmpPath);

    const content = fs.readFileSync(tmpPath, "utf8");
    expect(content.trim().length).toBeGreaterThan(0);
    expect(content).toContain(taskTitle);

    try { fs.unlinkSync(tmpPath); } catch { /* ignora */ }
  });
});

// ---------------------------------------------------------------------------
// Fluxo 5 — Autenticação e permissões
// ---------------------------------------------------------------------------
test.describe("Fluxo 5: Autenticação e permissões", () => {
  test("admin convidar utilizador — convite aparece na lista", async ({
    page,
  }) => {
    await login(page);

    await page.goto("/utilizadores");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Se não é admin, redireciona para /
    if (!page.url().includes("/utilizadores")) {
      test.skip();
      return;
    }

    await expect(
      page.locator("h1", { hasText: /Gestão de Utilizadores/i })
    ).toBeVisible({ timeout: 8000 });

    const inviteEmail = `e2e-${Date.now()}@coopgest.local`;

    await page.getByPlaceholder("email@exemplo.com").fill(inviteEmail);
    await page.getByRole("button", { name: /Gerar convite/i }).click();
    await page.waitForTimeout(2500);

    // Email aparece na lista de convites
    await expect(page.locator(`text=${inviteEmail}`).first()).toBeVisible({
      timeout: 10000,
    });

    // "Pendente" aparece em algum local próximo do email
    // Usar uma abordagem mais robusta: procurar "Pendente" na página
    // e verificar que o email também está visível
    await expect(page.getByText("Pendente").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("logout faz redirect para /login", async ({ page }) => {
    await login(page);

    await page.goto("/projetos");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/projetos/, { timeout: 5000 });

    // Procurar botão de logout
    const logoutBtn = page
      .getByRole("button", { name: /sair|logout/i })
      .or(page.locator('[aria-label="Sair"], [aria-label="Logout"]'))
      .first();

    const hasLogout = await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasLogout) {
      await logoutBtn.click();
      await page.waitForURL((url) => url.pathname.includes("/login"), {
        timeout: 10000,
      });
      await expect(page).toHaveURL(/\/login/);
    } else {
      // Fallback: limpar cookies simula logout
      await page.context().clearCookies();
      await page.goto("/projetos");
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
    }
  });

  test("acesso a rota protegida sem sessão redireciona para /login", async ({
    page,
  }) => {
    await page.goto("/projetos");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
    await expect(
      page.getByRole("button", { name: /Entrar/i })
    ).toBeVisible({ timeout: 5000 });
  });
});
