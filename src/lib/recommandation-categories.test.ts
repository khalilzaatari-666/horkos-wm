import { describe, it, expect } from "vitest";
import { grouperParCategorie, SANS_CATEGORIE } from "./recommandation-categories";

/**
 * La catégorie d'une recommandation est un texte libre : c'est le cabinet qui la
 * frappe, formulaire après formulaire. Le regroupement doit donc encaisser les
 * écarts de saisie sans multiplier les sections presque identiques - c'est tout
 * l'objet de ce qui est verrouillé ici.
 */
const reco = (title: string, category: string | null) => ({ title, category });

describe("grouperParCategorie", () => {
  it("rend une section par catégorie", () => {
    const groupes = grouperParCategorie(
      [reco("PER", "Retraite"), reco("PEA", "Épargne"), reco("Madelin", "Retraite")],
      (r) => r.category
    );

    expect(groupes.map((g) => g.categorie)).toEqual(["Épargne", "Retraite"]);
    expect(groupes[1].rows.map((r) => r.title)).toEqual(["PER", "Madelin"]);
  });

  it("classe alphabétiquement au sens du français, accents compris", () => {
    const groupes = grouperParCategorie(
      [reco("a", "Fiscalité"), reco("b", "Épargne"), reco("c", "Assurance")],
      (r) => r.category
    );

    expect(groupes.map((g) => g.categorie)).toEqual(["Assurance", "Épargne", "Fiscalité"]);
  });

  it("réunit les saisies qui ne diffèrent que par la casse ou les espaces", () => {
    const groupes = grouperParCategorie(
      [reco("a", "Retraite"), reco("b", " retraite "), reco("c", "RETRAITE")],
      (r) => r.category
    );

    expect(groupes).toHaveLength(1);
    // La première orthographe rencontrée fait foi pour le titre de section.
    expect(groupes[0].categorie).toBe("Retraite");
    expect(groupes[0].rows).toHaveLength(3);
  });

  it("range les recommandations sans catégorie dans un fourre-tout, en dernier", () => {
    const groupes = grouperParCategorie(
      [reco("a", null), reco("b", "  "), reco("c", "Retraite")],
      (r) => r.category
    );

    expect(groupes.map((g) => g.categorie)).toEqual(["Retraite", SANS_CATEGORIE]);
    expect(groupes[1].rows.map((r) => r.title)).toEqual(["a", "b"]);
  });

  it("ne rend aucune section sur une liste vide", () => {
    expect(grouperParCategorie([], (r: { category: string }) => r.category)).toEqual([]);
  });
});
