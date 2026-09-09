import { defineConfig, devices } from "@playwright/test";

// Para correr os testes E2E é necessário que o backend Flask esteja activo
// em http://localhost:8000 (py wsgi.py ou arrancar.bat opção 1).
// O frontend é iniciado automaticamente por este config.
//
// Uso local:
//   1. npm run e2e          (arranca backend + frontend automaticamente)
//
// Nota: o globalSetup repõe a password do admin para coopgest2025 antes
// dos testes, para garantir credenciais conhecidas independentemente do
// estado da base de dados de desenvolvimento.

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 120000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/e2e_frontend.ps1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "py wsgi.py",
      url: "http://localhost:8000/api/health",
      reuseExistingServer: true,
      timeout: 60000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
