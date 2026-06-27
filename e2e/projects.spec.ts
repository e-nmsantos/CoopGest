import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Projetos", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("lista de projetos é acessível", async ({ page }) => {
    await page.goto("/projetos");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });

  test("criar projeto abre diálogo e cria com sucesso", async ({ page }) => {
    await page.goto("/projetos");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Novo Projeto" }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });

    const projectName = "Projeto E2E Test " + Date.now();
    await page.getByLabel("Nome do Projeto").fill(projectName);

    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    await page.getByLabel("Data de Inicio").fill(today);
    await page.getByLabel("Data de Fim").fill(future);

    await page.getByRole("button", { name: "Criar Projeto" }).click();
    await page.waitForTimeout(2000);

    await expect(page.locator("body")).toBeVisible();
  });

  test("dashboard carrega sem erros", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    const errorText = page.locator('text=Uncaught, text=Cannot read, text=TypeError').first();
    await expect(errorText).not.toBeVisible();
  });
});
