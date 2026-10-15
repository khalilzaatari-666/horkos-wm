import { describe, it, expect } from "vitest";
import { hauteurNette } from "./pdf-preview";

describe("aperçu d'un guide", () => {
  it("garde nette la moitié haute de la première page", () => {
    expect(hauteurNette(1697)).toBe(849);
    expect(hauteurNette(0)).toBe(1);
  });
});
