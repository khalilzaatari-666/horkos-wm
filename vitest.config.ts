import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "node:path";

/**
 * Vitest pour la logique de réservation et le CreneauPicker.
 *
 * jsdom pour les tests de composant ; l'alias `@/` reflète tsconfig pour que
 * les imports de test soient identiques à ceux du code applicatif.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
