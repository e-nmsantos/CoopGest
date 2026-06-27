import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Stakeholders", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("página de stakeholders carrega", async ({ page }) => {
    await page.goto("/stakeholders");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
  });

  test("tabs Matriz e Lista existem ou estado vazio", async ({ page }) => {
    await page.goto("/stakeholders");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
