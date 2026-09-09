import { Page } from "@playwright/test";

async function openLoginPage(page: Page) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto("/login", { waitUntil: "commit", timeout: 20000 });
      const usernameInput = page.getByLabel("Utilizador");
      await usernameInput.waitFor({ state: "visible", timeout: 15000 });
      return usernameInput;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(2000);
    }
  }
  throw lastError;
}

export async function login(page: Page, username = "admin", password = "coopgest2025") {
  const usernameInput = await openLoginPage(page);
  await usernameInput.fill(username);
  await page.getByLabel("Password").fill(password);
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/auth/login") && res.status() === 200,
      { timeout: 30000 },
    ),
    page.getByRole("button", { name: "Entrar" }).click(),
  ]);
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });
}

export async function createProject(page: Page, name: string) {
  await page.goto("/projetos");
  await page.waitForLoadState("load");
  await page.getByRole("button", { name: "Novo Projeto" }).click();
  await page.getByLabel("Nome do Projeto").fill(name);
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel("Data de Inicio").fill(today);
  await page.getByLabel("Data de Fim").fill(future);
  await page.getByRole("button", { name: "Criar Projeto" }).click();
  await page.waitForTimeout(1000);
}
