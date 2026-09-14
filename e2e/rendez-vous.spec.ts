import { test, expect } from "@playwright/test";

/**
 * Le questionnaire de rendez-vous se termine par une réservation réelle de
 * créneau (Google Calendar + emails) : on ne va pas jusqu'au bout. On vérifie
 * que la première étape s'affiche et que le passage à la suivante reste fermé
 * tant qu'aucun besoin n'est choisi.
 */
test("le questionnaire de rendez-vous s'ouvre sur la première étape", async ({ page }) => {
  await page.goto("/rendez-vous");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Faisons connaissance");
  await expect(page.getByRole("heading", { level: 2 })).toContainText("De quoi avez-vous besoin");

  const next = page.getByRole("button", { name: /Continuer/ });
  await expect(next).toBeDisabled();

  await page.getByRole("button", { name: "Préparer ma retraite" }).click();
  await expect(next).toBeEnabled();
});
