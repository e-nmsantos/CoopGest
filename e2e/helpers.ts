import { Page } from "@playwright/test";

export async function login(page: Page, username = "admin", password = "coopgest2025") {
  await page.goto("/login");
  await page.fill('input[name="username"], input[placeholder*="tilizador"], input[type="text"]', username);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
}

export async function createProject(page: Page, name: string) {
  await page.goto("/projetos");
  // Look for create/new project button
  const createBtn = page.locator('button:has-text("Novo"), button:has-text("Criar"), button:has-text("Projeto")').first();
  await createBtn.click();
  // Fill in project name
  await page.fill('input[placeholder*="ome"], input[name="nome"]', name);
  // Submit
  await page.click('button[type="submit"]:has-text("Criar"), button:has-text("Guardar"), button:has-text("Criar Projeto")');
  await page.waitForTimeout(1000);
}
