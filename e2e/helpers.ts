import { Page } from "@playwright/test";

export async function login(page: Page, username = "admin", password = "coopgest2025") {
  await page.goto("/login");
  await page.getByLabel("Utilizador").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
}

export async function createProject(page: Page, name: string) {
  await page.goto("/projetos");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Novo Projeto" }).click();
  await page.getByLabel("Nome do Projeto").fill(name);
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel("Data de Inicio").fill(today);
  await page.getByLabel("Data de Fim").fill(future);
  await page.getByRole("button", { name: "Criar Projeto" }).click();
  await page.waitForTimeout(1000);
}
