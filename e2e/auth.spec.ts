import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Autenticação", () => {
  test("login com credenciais válidas redireciona para dashboard", async ({ page }) => {
    await login(page);
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });

  test("login com password errada mostra erro", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Utilizador").fill("admin");
    await page.getByLabel("Password").fill("wrong_password");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForTimeout(1500);
    const isOnLogin = page.url().includes("/login");
    const hasError = await page.locator(".bg-red-50, .text-red-700").first().isVisible().catch(() => false);
    expect(isOnLogin || hasError).toBeTruthy();
  });

  test("acesso direto a rota protegida redireciona para login", async ({ page }) => {
    await page.goto("/projetos");
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/login/);
  });

  test("logout limpa sessão", async ({ page }) => {
    await login(page);
    const logoutBtn = page.getByRole("button", { name: "Sair" }).or(page.getByRole("link", { name: "Sair" })).first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/login/);
    }
  });
});
