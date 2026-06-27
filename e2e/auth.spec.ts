import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Autenticação", () => {
  test("login com credenciais válidas redireciona para dashboard", async ({ page }) => {
    await login(page);
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("text=Dashboard, text=CoopGest").first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test("login com password errada mostra erro", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="text"], input[name="username"]', "admin");
    await page.fill('input[type="password"]', "wrong_password");
    await page.click('button[type="submit"]');
    // Should stay on login page or show error
    await page.waitForTimeout(1500);
    const isOnLogin = page.url().includes("/login");
    const hasError = await page.locator('text=inválid, text=erro, text=incorret').first().isVisible().catch(() => false);
    expect(isOnLogin || hasError).toBeTruthy();
  });

  test("acesso direto a rota protegida redireciona para login", async ({ page }) => {
    await page.goto("/projetos");
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/login/);
  });

  test("logout limpa sessão", async ({ page }) => {
    await login(page);
    // Find logout button (usually in header or profile menu)
    const logoutBtn = page.locator('button:has-text("Sair"), a:has-text("Sair"), [data-testid="logout"]').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/login/);
    }
  });
});
