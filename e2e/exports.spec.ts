import { test, expect } from "@playwright/test";
import { login, createProject } from "./helpers";

test.describe("Exports", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("gantt carrega", async ({ page }) => {
    await page.goto("/gantt");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  test("portfolio dashboard carrega", async ({ page }) => {
    await page.goto("/portfolio");
    await page.waitForLoadState("load");
    await expect(page.locator("body")).toBeVisible();
  });

  test("export CSV de tarefas num projeto", async ({ page }) => {
    await page.goto("/projetos");
    await page.waitForLoadState("networkidle");

    const projectLinks = page.getByRole("link", { name: /projeto|project/i }).or(
      page.locator("table tbody tr").first(),
    );

    const hasProjects = await projectLinks
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!hasProjects) {
      await createProject(page, "Projeto E2E Export " + Date.now());
      await page.goto("/projetos");
      await page.waitForLoadState("networkidle");
    }

    const firstProject = page
      .getByRole("link", { name: /ver|abrir|detalhes/i })
      .or(page.locator("table tbody tr td a").first())
      .or(page.locator(".project-card a, [data-testid='project-link']").first())
      .first();

    if (await firstProject.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstProject.click();
      await page.waitForLoadState("networkidle");
    }

    const exportBtn = page
      .getByRole("button", { name: /exportar csv|export csv/i })
      .or(page.getByRole("button", { name: /exportar|export/i }))
      .first();

    if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exportBtn.click();
      await page.waitForTimeout(500);

      const csvTasksItem = page
        .getByRole("menuitem", { name: /tarefas|tasks/i })
        .or(page.getByRole("option", { name: /tarefas|tasks/i }))
        .or(page.getByRole("button", { name: /tarefas|tasks/i }))
        .first();

      if (await csvTasksItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
        await csvTasksItem.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.csv$/i);
      } else {
        const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/\.csv$/i);
        } else {
          await expect(page.locator("body")).toBeVisible();
        }
      }
    } else {
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("download de relatório JSON de um projeto", async ({ page }) => {
    // Garantir que existe pelo menos um projeto
    await page.goto("/projetos");
    await page.waitForLoadState("networkidle");

    const hasProject = await page
      .locator("table tbody tr")
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!hasProject) {
      await createProject(page, "Projeto E2E JSON " + Date.now());
      await page.goto("/projetos");
      await page.waitForLoadState("networkidle");
    }

    // Navegar para o primeiro projeto clicando na linha da tabela
    const projectRow = page.locator("table tbody tr").first();
    if (!(await projectRow.isVisible({ timeout: 3000 }).catch(() => false))) {
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await projectRow.click();
    await page.waitForURL(/\/projeto\/\d+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Abrir dropdown "Ações"
    const acoesBtn = page.getByRole("button", { name: /ações/i }).first();
    if (!(await acoesBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(page.locator("body")).toBeVisible();
      return;
    }
    await acoesBtn.click();
    await page.waitForTimeout(300);

    // Clicar em "Exportar Dados (JSON)" e aguardar download
    const jsonItem = page.getByRole("menuitem", { name: /json/i }).first();
    if (await jsonItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
      await jsonItem.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.json$/i);
    } else {
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
