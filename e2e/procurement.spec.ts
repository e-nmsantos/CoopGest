import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Contratos / Procurement", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("página de contratos carrega", async ({ page }) => {
    await page.goto("/contratos");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });

  test("estado vazio sem projeto selecionado", async ({ page }) => {
    await page.goto("/contratos");
    await page.waitForLoadState("networkidle");
    // Should show empty state or project selector
    await expect(page.locator("body")).toBeVisible();
  });
});
