import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Chaque test repart d'un DOM propre : sans ça, les composants montés fuient
// d'un test à l'autre et les requêtes `screen` deviennent ambiguës.
afterEach(() => {
  cleanup();
});
