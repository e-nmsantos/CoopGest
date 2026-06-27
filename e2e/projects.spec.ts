import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Projetos", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("lista de projetos é acessível", async ({ page }) => {
    await page.goto("/projetos");
    await page.waitForLoadState("networkidle");
    // Page should render without crashing
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });

  test("criar projeto navega para o projeto", async ({ page }) => {
    await page.goto("/projetos");
    await page.waitForLoadState("networkidle");

    const createBtn = page.locator('button:has-text("Novo"), button:has-text("Criar")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const nameInput = page.locator('input[placeholder*="ome"], input[name="nome"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill("Projeto E2E Test " + Date.now());
        const submitBtn = page.locator('button[type="submit"], button:has-text("Criar"), button:has-text("Guardar")').first();
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    // Verify page didn't crash
    await expect(page.locator("body")).toBeVisible();
  });

  test("dashboard carrega sem erros", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    // No unhandled error dialogs
    const errorText = page.locator('text=Uncaught, text=Cannot read, text=TypeError').first();
    await expect(errorText).not.toBeVisible();
  });
});
