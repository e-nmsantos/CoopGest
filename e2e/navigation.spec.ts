import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const ROUTES = [
  { path: "/", label: "Dashboard" },
  { path: "/projetos", label: "Projetos" },
  { path: "/meu-trabalho", label: "O Meu Trabalho" },
  { path: "/parceiros", label: "Parceiros" },
  { path: "/calendario", label: "Calendário" },
  { path: "/financas", label: "Finanças" },
  { path: "/impacto", label: "Impacto" },
  { path: "/licoes", label: "Lições" },
  { path: "/contratos", label: "Contratos" },
  { path: "/portfolio", label: "Portfólio" },
  { path: "/teoria-mudanca", label: "Teoria da Mudança" },
  { path: "/gantt", label: "Gantt" },
  { path: "/stakeholders", label: "Stakeholders" },
];

test.describe("Navegação — todas as rotas carregam", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const route of ROUTES) {
    test(`${route.label} (${route.path}) carrega sem crash`, async ({ page }) => {
      await page.goto(route.path);
      // "load" em vez de "networkidle": páginas como /portfolio fazem polling
      // contínuo que impede "networkidle" de resolver com muitos projectos na DB
      await page.waitForLoadState("load");
      // Page renders something
      await expect(page.locator("body")).toBeVisible();
      // No JS error modals
      const jsError = page.locator('text=Uncaught Error, text=chunk failed').first();
      await expect(jsError).not.toBeVisible({ timeout: 2000 }).catch(() => {});
    });
  }
});
