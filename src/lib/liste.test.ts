import { describe, it, expect } from "vitest";
import { param, pick, sensDe, recherche, trier, instant, contient } from "./liste";

/**
 * Ces helpers portent le tri et les filtres de toutes les listes du site. Deux
 * points méritent d'être verrouillés plus que les autres : `pick`, qui est la
 * seule barrière entre une URL trafiquée et le reste de la page, et l'ordre des
 * cases vides, qui décide de ce qu'un conseiller voit en haut de son tableau.
 */
describe("param", () => {
  it("rend la première valeur d'un paramètre répété", () => {
    expect(param({ tri: ["nom", "date"] }, "tri")).toBe("nom");
  });

  it("rend undefined pour un paramètre absent", () => {
    expect(param({}, "tri")).toBeUndefined();
  });
});

describe("pick", () => {
  it("accepte une valeur de la liste autorisée", () => {
    expect(pick("date", ["nom", "date"], "nom")).toBe("date");
  });

  it("retombe sur le défaut pour une valeur inconnue", () => {
    expect(pick("; drop table", ["nom", "date"], "nom")).toBe("nom");
  });

  it("retombe sur le défaut quand rien n'est fourni", () => {
    expect(pick(undefined, ["nom"], "nom")).toBe("nom");
    expect(pick(undefined, ["nom"], null)).toBeNull();
  });
});

describe("sensDe", () => {
  it("ne reconnaît que asc et desc", () => {
    expect(sensDe("desc")).toBe("desc");
    expect(sensDe("asc", "desc")).toBe("asc");
    expect(sensDe("n'importe quoi", "desc")).toBe("desc");
    expect(sensDe(undefined)).toBe("asc");
  });
});

describe("recherche", () => {
  it("neutralise les caractères qui ont un sens dans un filtre PostgREST", () => {
    expect(recherche({ q: "a,b(c)%d*e:f" })).toBe("a b c  d e f");
  });

  it("borne la longueur du terme", () => {
    expect(recherche({ q: "x".repeat(200) })).toHaveLength(80);
  });
});

describe("trier", () => {
  const rows = [
    { nom: "Zidane", valeur: 10 },
    { nom: "Élodie", valeur: null },
    { nom: "Amine", valeur: 30 },
  ];

  it("classe le texte au sens du français, accents compris", () => {
    expect(trier(rows, (r) => r.nom, "asc").map((r) => r.nom)).toEqual([
      "Amine",
      "Élodie",
      "Zidane",
    ]);
  });

  it("classe les nombres comme des nombres, pas comme du texte", () => {
    expect(trier([{ v: 9 }, { v: 100 }], (r) => r.v, "asc").map((r) => r.v)).toEqual([9, 100]);
  });

  it("renvoie les cases vides en dernier dans les deux sens", () => {
    expect(trier(rows, (r) => r.valeur, "asc").at(-1)?.nom).toBe("Élodie");
    expect(trier(rows, (r) => r.valeur, "desc").at(-1)?.nom).toBe("Élodie");
  });

  it("départage les ex æquo avec la clé secondaire", () => {
    const egaux = [
      { nom: "Bernard", v: 5 },
      { nom: "Alice", v: 5 },
    ];
    expect(trier(egaux, (r) => r.v, "asc", (r) => r.nom).map((r) => r.nom)).toEqual([
      "Alice",
      "Bernard",
    ]);
  });

  it("ne réordonne pas la liste d'origine", () => {
    const source = [{ v: 2 }, { v: 1 }];
    trier(source, (r) => r.v, "asc");
    expect(source.map((r) => r.v)).toEqual([2, 1]);
  });
});

describe("instant", () => {
  it("compare les dates comme des instants", () => {
    expect(instant("2026-01-02T00:00:00Z")!).toBeGreaterThan(instant("2026-01-01T00:00:00Z")!);
  });

  it("rend null sur une date absente ou illisible", () => {
    expect(instant(null)).toBeNull();
    expect(instant("pas une date")).toBeNull();
  });
});

describe("contient", () => {
  it("ignore la casse et les accents", () => {
    expect(contient(["Bénali"], "benali")).toBe(true);
    expect(contient(["Benali"], "BÉNALI")).toBe(true);
  });

  it("exige que chaque mot du terme soit présent", () => {
    expect(contient(["Amine Benali", "amine@exemple.ma"], "benali amine")).toBe(true);
    expect(contient(["Amine Benali"], "amine zidane")).toBe(false);
  });

  it("laisse tout passer quand le terme est vide", () => {
    expect(contient([null], "")).toBe(true);
  });
});
