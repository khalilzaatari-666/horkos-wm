import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout sur les parcours sans compte : site public, formulaires
 * et connexion de l'équipe. Les parcours authentifiés restent dans la recette
 * manuelle de TESTING.md - ils demandent des comptes de test dans Supabase.
 *
 * `webServer` réutilise un `next dev` déjà lancé (reuseExistingServer) ; sinon
 * il en démarre un. Les formulaires écrivent réellement dans la base pointée
 * par `.env.local` : à lancer sur un projet de développement, jamais en prod.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    locale: "fr-FR",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
