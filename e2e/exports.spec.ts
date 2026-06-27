import { test, expect } from "@playwright/test";
import { login } from "./helpers";

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
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
