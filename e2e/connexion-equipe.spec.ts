import { test, expect } from "@playwright/test";
import { rateLimitRpcExists } from "./env";

/**
 * Connexion de l'équipe : mauvais identifiants -> message générique, puis la
 * limitation de débit (5 tentatives / minute par IP) prend le relais.
 *
 * La limite est partagée par tous les tests d'une même machine : cette suite
 * tourne en série, sur un seul projet, et n'affirme rien sur le rang exact de
 * la tentative bloquée - seulement qu'elle survient avant la septième.
 */
test.describe.configure({ mode: "serial" });

test.describe("connexion équipe", () => {
  test.skip(({ isMobile }) => isMobile, "Une seule fenêtre de limitation par machine.");

  test.beforeAll(async () => {
    // Sans la migration 015, `rateLimit` est fail-open : le test ne peut rien
    // prouver. On le dit plutôt que d'échouer sur une cause invisible.
    test.skip(
      !(await rateLimitRpcExists()),
      "RPC rate_limit_hit absente : appliquer supabase/migrations/015_rate_limits.sql sur le projet."
    );
  });

  test("refuse un mauvais mot de passe puis bloque après plusieurs tentatives", async ({ page }) => {
    await page.goto("/connexion/equipe");

    let limited = false;
    for (let i = 0; i < 7 && !limited; i++) {
      await page.getByLabel("Email").fill("inconnu@example.com");
      await page.getByLabel("Mot de passe", { exact: true }).fill(`mauvais-mot-de-passe-${i}`);
      // Le message précédent reste affiché pendant l'envoi : on attend la
      // réponse de la server action avant de lire l'alerte.
      await Promise.all([
        page.waitForResponse(
          (r) => r.request().method() === "POST" && r.url().includes("/connexion/equipe")
        ),
        page.getByRole("button", { name: "Se connecter" }).click(),
      ]);

      // Next pose aussi un `role="alert"` pour annoncer les navigations.
      const alert = page.locator('form [role="alert"]');
      await expect(alert).toBeVisible({ timeout: 15_000 });
      const text = (await alert.textContent()) ?? "";
      expect(text).toMatch(/incorrect|Trop de tentatives/);
      limited = /Trop de tentatives/.test(text);
    }

    expect(limited, "la limitation de débit doit s'enclencher avant la septième tentative").toBe(true);
    await expect(page).toHaveURL(/\/connexion\/equipe/);
  });
});
