import { test, expect } from "@playwright/test";

/**
 * Le formulaire de contact écrit dans la table `contacts` de la base pointée
 * par `.env.local`, et la limitation de débit (5 envois / 10 min par IP) est
 * réelle : un lancement répété tombe légitimement dessus. Le test de succès
 * accepte donc les deux issues.
 */
test.describe("formulaire de contact", () => {
  test("le bouton reste désactivé tant que le message est trop court", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Nom complet").fill("Jean Dupont");
    await page.getByLabel("Email").fill("jean@example.com");
    await page.locator("#phone").fill("612345678");
    await page.getByLabel("Message").fill("Court");

    await expect(page.getByRole("button", { name: "Envoyer le message" })).toBeDisabled();

    await page.getByLabel("Message").blur();
    await expect(page.getByText("Votre message est trop court.")).toBeVisible();
  });

  test("un message complet est accepté (ou retenu par la limitation de débit)", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Nom complet").fill("Jean Dupont");
    await page.getByLabel("Email").fill("jean.dupont@example.com");
    await page.locator("#phone").fill("612345678");
    await page.getByLabel("Message").fill("Message de test envoyé par la suite e2e Playwright.");

    const submit = page.getByRole("button", { name: "Envoyer le message" });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(
      page.getByText("Message bien reçu").or(page.getByText("Trop de messages envoyés"))
    ).toBeVisible({ timeout: 15_000 });
  });
});
