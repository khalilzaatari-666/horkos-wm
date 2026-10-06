import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/public", () => ({ createPublicClient: vi.fn() }));

import { filtrerParCategorie } from "./content";

const items = [
  { id: "a", category: "Fiscalité" },
  { id: "b", category: "Transmission" },
  { id: "c", category: null },
];

describe("filtrerParCategorie", () => {
  it("ne propose que les catégories utilisées, dans l'ordre du back-office", () => {
    const r = filtrerParCategorie(items, ["Transmission", "Marchés", "Fiscalité"], undefined);
    expect(r.categories).toEqual(["Transmission", "Fiscalité"]);
    expect(r.active).toBeNull();
    expect(r.visibles).toHaveLength(3);
  });

  it("filtre sur la catégorie demandée", () => {
    const r = filtrerParCategorie(items, ["Fiscalité", "Transmission"], "Fiscalité");
    expect(r.active).toBe("Fiscalité");
    expect(r.visibles.map((i) => i.id)).toEqual(["a"]);
  });

  it("ignore une catégorie inconnue ou vide sur la page", () => {
    expect(filtrerParCategorie(items, ["Fiscalité", "Marchés"], "Marchés").active).toBeNull();
    expect(filtrerParCategorie(items, ["Fiscalité"], ["Fiscalité", "x"]).visibles).toHaveLength(3);
  });
});
