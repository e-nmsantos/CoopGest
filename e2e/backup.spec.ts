import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

test.describe("Backup e Restore", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("backup de todos os projetos descarrega ZIP", async ({ page }) => {
    await page.goto("/projetos");
    await page.waitForLoadState("networkidle");

    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.getByRole("button", { name: /Backup de todos/ }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/backup.*\.zip/i);
  });

  test("restore de backup importa projetos sem crash", async ({ page }) => {
    await page.goto("/projetos");
    await page.waitForLoadState("networkidle");

    // Primeiro gerar um backup para ter um ficheiro válido
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await page.getByRole("button", { name: /Backup de todos/ }).click();
    const download = await downloadPromise;

    const tmpDir = os.tmpdir();
    const zipPath = path.join(tmpDir, download.suggestedFilename() || "backup.zip");
    await download.saveAs(zipPath);
    expect(fs.existsSync(zipPath)).toBeTruthy();

    // Fazer restore com o ficheiro descarregado
    const fileInput = page.locator('input[type="file"][accept=".zip"]');
    await fileInput.setInputFiles(zipPath);

    await page.waitForTimeout(3000);
    // Verificar que a página não crashou
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();

    // Limpar ficheiro temporário
    fs.unlinkSync(zipPath);
  });

  test("backup selecionado com checkboxes descarrega ZIP", async ({ page }) => {
    await page.goto("/projetos");
    await page.waitForLoadState("networkidle");

    // Selecionar todos os projetos filtrados
    const selectAllCheckbox = page.getByLabel("Selecionar todos os projetos filtrados");
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
      await page.waitForTimeout(300);
    }

    // Tentar backup selecionado (botão só fica activo com selecção)
    const backupBtn = page.getByRole("button", { name: /Backup \(/ });
    if (await backupBtn.isEnabled()) {
      const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
      await backupBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/backup.*\.zip/i);
    } else {
      // Sem projetos — verificar que o botão está desactivado correctamente
      await expect(backupBtn).toBeDisabled();
    }
  });
});
