import { defineConfig, devices } from "@playwright/test";

// Para correr os testes E2E é necessário que o backend Flask esteja activo
// em http://localhost:8000 (py wsgi.py ou arrancar.bat opção 1).
// O frontend é iniciado automaticamente por este config.
//
// Uso local:
//   1. Inicie o backend: py wsgi.py
//   2. npm run e2e
//
// Uso CI: defina BACKEND_URL e CI=true no ambiente.

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:5173",
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
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "py wsgi.py",
      url: "http://localhost:8000",
      reuseExistingServer: true,
      timeout: 60000,
      stdout: "ignore",
      stderr: "ignore",
    },
  ],
});
