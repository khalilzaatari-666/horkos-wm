import { test, expect } from "@playwright/test";

/**
 * Questionnaire de partenariat (/conseil/reseau). Écrit dans
 * `partner_submissions` ; la limitation de débit (5 / 10 min par IP) est
 * réelle, le test de succès accepte les deux issues.
 */
test.describe("questionnaire de partenariat", () => {
  test("les champs changent avec la catégorie", async ({ page }) => {
    await page.goto("/conseil/reseau");
    const form = page.locator("form").filter({ has: page.locator('input[name="category"]') });
    await form.scrollIntoViewIfNeeded();

    // Catégorie par défaut : société de gestion.
    await expect(form.locator('input[name="category"]')).toHaveValue("gestion");
    await expect(form.getByLabel("Encours sous gestion (MAD)")).toBeVisible();

    await page.getByRole("button", { name: "Agent immobilier" }).click();
    await expect(form.locator('input[name="category"]')).toHaveValue("immo");
    await expect(form.getByLabel("Prix de vente (MAD)")).toBeVisible();
    await expect(form.getByLabel("Encours sous gestion (MAD)")).toHaveCount(0);
  });

  test("la validation navigateur bloque un envoi incomplet", async ({ page }) => {
    await page.goto("/conseil/reseau");
    const form = page.locator("form").filter({ has: page.locator('input[name="category"]') });
    await form.getByRole("button", { name: "Soumettre ma proposition" }).click();

    // Aucun envoi : le premier champ obligatoire vide est signalé par le navigateur.
    const invalid = await form.evaluate((f) => (f as HTMLFormElement).querySelector(":invalid") !== null);
    expect(invalid).toBe(true);
    await expect(page.getByText("Proposition bien reçue")).toHaveCount(0);
  });

  test("une proposition complète est acceptée (ou retenue par la limitation de débit)", async ({ page }) => {
    await page.goto("/conseil/reseau");
    await page.getByRole("button", { name: "Agent immobilier" }).click();
    const form = page.locator("form").filter({ has: page.locator('input[name="category"]') });

    await form.getByLabel("Type de bien à proposer").selectOption("Local commercial");
    await form.getByLabel("Localisation").fill("Casablanca, Maarif");
    await form.getByLabel("Prix de vente (MAD)").fill("5000000");
    await form.getByLabel("Rendement locatif estimé (%)").fill("6.5");
    await form.getByLabel("Nom du contact").fill("Sara Alaoui");
    await form.getByLabel("Société").fill("Atlas Immo");
    await form.locator("#phone").fill("612345678");
    await form.getByLabel("Email").fill("sara@example.com");
    await form.getByLabel("Description complémentaire").fill("Proposition envoyée par la suite e2e.");

    await form.getByRole("button", { name: "Soumettre ma proposition" }).click();

    await expect(
      page.getByText("Proposition bien reçue").or(page.getByText("Trop de propositions envoyées"))
    ).toBeVisible({ timeout: 15_000 });
  });
});
