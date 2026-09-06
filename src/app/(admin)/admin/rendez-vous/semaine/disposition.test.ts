import { describe, it, expect } from "vitest";
import { disposer } from "./disposition";

/** Raccourci lisible : « 9h00 » → minutes depuis minuit. */
const h = (heures: number, minutes = 0) => heures * 60 + minutes;

describe("disposer", () => {
  it("laisse un rendez-vous seul sur toute la largeur", () => {
    expect(disposer([{ debut: h(9), fin: h(10) }])).toEqual([{ colonne: 0, total: 1 }]);
  });

  it("ne partage pas la largeur entre deux heures distinctes", () => {
    // Le cas courant d'une journée : rien ne se chevauche, tout est pleine
    // largeur. C'est ce que la notion de grappe protège.
    expect(
      disposer([
        { debut: h(9), fin: h(10) },
        { debut: h(11), fin: h(12) },
      ])
    ).toEqual([
      { colonne: 0, total: 1 },
      { colonne: 0, total: 1 },
    ]);
  });

  it("met côte à côte deux rendez-vous à la même heure", () => {
    expect(
      disposer([
        { debut: h(9), fin: h(10) },
        { debut: h(9), fin: h(10) },
      ])
    ).toEqual([
      { colonne: 0, total: 2 },
      { colonne: 1, total: 2 },
    ]);
  });

  it("sépare aussi un chevauchement partiel", () => {
    // 9h00-10h00 et 9h30-10h30 ne partagent aucun créneau de la grille : un
    // placement par créneau les superposerait.
    const places = disposer([
      { debut: h(9), fin: h(10) },
      { debut: h(9, 30), fin: h(10, 30) },
    ]);
    expect(places.map((p) => p.colonne)).toEqual([0, 1]);
    expect(places.every((p) => p.total === 2)).toBe(true);
  });

  it("réutilise une colonne libérée dans la même grappe", () => {
    // A 9h-10h, B 9h30-10h30, C 10h-11h : C tient dans la colonne de A, et la
    // grappe reste à deux colonnes plutôt que d'en ouvrir une troisième.
    const places = disposer([
      { debut: h(9), fin: h(10) },
      { debut: h(9, 30), fin: h(10, 30) },
      { debut: h(10), fin: h(11) },
    ]);
    expect(places.map((p) => p.colonne)).toEqual([0, 1, 0]);
    expect(places.map((p) => p.total)).toEqual([2, 2, 2]);
  });

  it("repart pleine largeur après une grappe", () => {
    const places = disposer([
      { debut: h(9), fin: h(10) },
      { debut: h(9), fin: h(10) },
      { debut: h(14), fin: h(15) },
    ]);
    expect(places[2]).toEqual({ colonne: 0, total: 1 });
  });

  it("n'ouvre pas de colonne pour un rendez-vous qui commence quand l'autre finit", () => {
    const places = disposer([
      { debut: h(9), fin: h(10) },
      { debut: h(10), fin: h(11) },
    ]);
    expect(places.every((p) => p.total === 1)).toBe(true);
  });

  it("rend les places dans l'ordre reçu, pas dans l'ordre chronologique", () => {
    // La vue rend les blocs dans l'ordre de la requête : une place décalée
    // d'un cran attribuerait la largeur au mauvais rendez-vous.
    const places = disposer([
      { debut: h(14), fin: h(15) },
      { debut: h(9), fin: h(10) },
      { debut: h(9), fin: h(10) },
    ]);
    expect(places[0]).toEqual({ colonne: 0, total: 1 });
    expect(places[1].total).toBe(2);
    expect(places[2].total).toBe(2);
    expect(new Set([places[1].colonne, places[2].colonne])).toEqual(new Set([0, 1]));
  });

  it("supporte trois rendez-vous simultanés", () => {
    const places = disposer([
      { debut: h(9), fin: h(10) },
      { debut: h(9), fin: h(10) },
      { debut: h(9), fin: h(10) },
    ]);
    expect(places.map((p) => p.colonne)).toEqual([0, 1, 2]);
    expect(places.every((p) => p.total === 3)).toBe(true);
  });

  it("rend une liste vide sans broncher", () => {
    expect(disposer([])).toEqual([]);
  });
});
