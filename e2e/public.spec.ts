import { test, expect } from "@playwright/test";

test.describe("site public", () => {
  test("l'accueil se charge avec la navigation vers le rendez-vous", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Horkos/);

    // Le premier appel à l'action visible mène au questionnaire de rendez-vous.
    await page.locator('a[href="/rendez-vous"]:visible').first().click();
    await expect(page).toHaveURL(/\/rendez-vous$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Faisons connaissance");
  });

  test("une adresse inconnue rend la page 404 du cabinet", async ({ page }) => {
    const response = await page.goto("/cette-page-n-existe-pas");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("introuvable");
    await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toBeVisible();
  });

  test("robots.txt et sitemap.xml répondent", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");
  });

  test("les en-têtes de sécurité sont posés sur chaque réponse", async ({ request }) => {
    for (const path of ["/", "/conseil/reseau", "/connexion/equipe"]) {
      const res = await request.get(path);
      const h = res.headers();
      expect(h["content-security-policy"], path).toContain("frame-ancestors 'none'");
      expect(h["content-security-policy"], path).toContain("default-src 'self'");
      expect(h["strict-transport-security"], path).toContain("max-age=");
      expect(h["x-content-type-options"], path).toBe("nosniff");
      expect(h["x-frame-options"], path).toBe("DENY");
      expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    }
  });

  test("la page ne déborde pas horizontalement", async ({ page }) => {
    for (const path of ["/", "/conseil/reseau", "/contact", "/rendez-vous", "/connexion"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `${path} déborde de ${overflow}px`).toBeLessThanOrEqual(1);
    }
  });
});
