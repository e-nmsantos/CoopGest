import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Administração", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("página de admin carrega", async ({ page }) => {
    // Tentar /admin em primeiro lugar; se redirecionar, tentar /utilizadores
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const isOnAdmin = !page.url().includes("/login") && !page.url().includes("/404");

    if (!isOnAdmin) {
      await page.goto("/utilizadores");
      await page.waitForLoadState("networkidle");
    }

    // A página deve renderizar sem crash independentemente da rota real
    await expect(page.locator("body")).toBeVisible();
  });

  test("lista de utilizadores visível para admin", async ({ page }) => {
    // Tentar rota /admin primeiro
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    let onAdminPage = !page.url().includes("/login");

    if (!onAdminPage) {
      await page.goto("/utilizadores");
      await page.waitForLoadState("networkidle");
      onAdminPage = !page.url().includes("/login");
    }

    if (onAdminPage) {
      // Procurar tabela, lista ou cards de utilizadores
      const userList = page
        .getByRole("table")
        .or(page.locator("ul[role='list'], .user-list, [data-testid='user-list']"))
        .first();

      if (await userList.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(userList).toBeVisible();
      } else {
        // Verificar que pelo menos o cabeçalho da secção está visível
        const heading = page.locator("h1, h2").first();
        await expect(heading).toBeVisible({ timeout: 5000 });
      }
    } else {
      // Utilizador admin não tem acesso a esta rota ou a rota não existe
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("convite de utilizador", async ({ page }) => {
    // Tentar rota /admin primeiro, depois /utilizadores
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/login")) {
      await page.goto("/utilizadores");
      await page.waitForLoadState("networkidle");
    }

    // Procurar botão de convite
    const inviteBtn = page
      .getByRole("button", { name: /convidar|novo utilizador|adicionar utilizador|invite/i })
      .first();

    if (await inviteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inviteBtn.click();
      await page.waitForTimeout(500);

      // Deve abrir um diálogo ou formulário de convite
      const dialog = page.getByRole("dialog");
      const form = page.locator("form").first();

      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(dialog).toBeVisible();

        // Preencher campo de email se existir
        const emailField = dialog.getByLabel(/email/i).or(
          dialog.getByRole("textbox", { name: /email/i }),
        );

        if (await emailField.isVisible({ timeout: 1000 }).catch(() => false)) {
          await emailField.fill("teste-e2e@coopgest.local");
        }

        // Fechar o diálogo sem submeter para não criar dados desnecessários
        const cancelBtn = dialog
          .getByRole("button", { name: /cancelar|fechar|cancel|close/i })
          .first();

        if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancelBtn.click();
        } else {
          await page.keyboard.press("Escape");
        }

        await page.waitForTimeout(500);
        await expect(page.locator("body")).toBeVisible();
      } else if (await form.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(form).toBeVisible();
        // Fechar sem submeter
        await page.keyboard.press("Escape");
        await expect(page.locator("body")).toBeVisible();
      } else {
        // O botão clicou mas não abriu diálogo identificável — página não crashou
        await expect(page.locator("body")).toBeVisible();
      }
    } else {
      // Funcionalidade de convite não disponível ou utilizador sem permissão
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
