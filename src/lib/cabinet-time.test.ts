import { describe, it, expect } from "vitest";
import {
  cabinetLocalToIso,
  partsCabinet,
  jourCabinet,
  lundiDeLaSemaine,
  lundiCourant,
  ajouterJours,
  rangDansLaSemaine,
  bornesSemaine,
} from "./cabinet-time";

/**
 * Le Maroc vit à UTC+1, sauf le temps du Ramadan où il revient à UTC+0. En 2026
 * le retour à UTC+1 tombe le dimanche 22 mars : c'est la date qui départage un
 * calcul juste d'un décalage figé.
 */

describe("cabinetLocalToIso", () => {
  it("lit une heure de cabinet en UTC+1", () => {
    expect(cabinetLocalToIso("2026-09-08T10:00")).toBe("2026-09-08T09:00:00.000Z");
  });

  it("lit une heure de cabinet pendant le Ramadan", () => {
    expect(cabinetLocalToIso("2026-03-01T09:00")).toBe("2026-03-01T09:00:00.000Z");
  });

  it("refuse une saisie qui n'est pas une date-heure", () => {
    expect(cabinetLocalToIso("2026-09-08")).toBeNull();
    expect(cabinetLocalToIso("hier")).toBeNull();
  });
});

describe("partsCabinet", () => {
  it("rend l'heure du cabinet, pas celle du serveur", () => {
    expect(partsCabinet(new Date("2026-09-08T09:00:00Z"))).toEqual({
      annee: 2026,
      mois: 9,
      jour: 8,
      minutes: 10 * 60,
    });
  });

  it("suit le fuseau pendant le Ramadan", () => {
    expect(partsCabinet(new Date("2026-03-01T09:00:00Z")).minutes).toBe(9 * 60);
  });

  it("fait basculer le jour avant minuit UTC", () => {
    // 23h30 UTC, c'est déjà le lendemain à Casablanca : un rendez-vous placé
    // d'après la date UTC atterrirait dans la mauvaise colonne.
    const p = partsCabinet(new Date("2026-09-07T23:30:00Z"));
    expect(p.jour).toBe(8);
    expect(p.minutes).toBe(30);
  });
});

describe("jourCabinet", () => {
  it("rend le jour civil du cabinet", () => {
    expect(jourCabinet(new Date("2026-09-08T09:00:00Z"))).toBe("2026-09-08");
    expect(jourCabinet(new Date("2026-09-07T23:30:00Z"))).toBe("2026-09-08");
  });
});

describe("lundiDeLaSemaine", () => {
  it("recule jusqu'au lundi", () => {
    // 2026-09-08 est un mardi.
    expect(lundiDeLaSemaine("2026-09-08")).toBe("2026-09-07");
  });

  it("laisse un lundi en place", () => {
    expect(lundiDeLaSemaine("2026-09-07")).toBe("2026-09-07");
  });

  it("rattache le dimanche à la semaine qui s'achève", () => {
    // 2026-09-13 est un dimanche : son lundi est le 7, pas le 14.
    expect(lundiDeLaSemaine("2026-09-13")).toBe("2026-09-07");
  });

  it("traverse un changement de mois", () => {
    // 2026-10-01 est un jeudi.
    expect(lundiDeLaSemaine("2026-10-01")).toBe("2026-09-28");
  });

  it("refuse une date qui n'existe pas au calendrier", () => {
    // `Date.parse` reporterait le 31 février sur mars sans broncher.
    expect(lundiDeLaSemaine("2026-02-31")).toBeNull();
    expect(lundiDeLaSemaine("2026-13-01")).toBeNull();
    expect(lundiDeLaSemaine("pas une date")).toBeNull();
    expect(lundiDeLaSemaine("")).toBeNull();
  });
});

describe("lundiCourant", () => {
  it("rend le lundi de la semaine en cours du lundi au samedi", () => {
    // Du 2026-09-07 (lundi) au 2026-09-12 (samedi).
    for (const jour of [
      "2026-09-07",
      "2026-09-08",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
    ]) {
      expect(lundiCourant(jour)).toBe("2026-09-07");
    }
  });

  it("ouvre la semaine qui commence quand on est dimanche", () => {
    // Le cabinet est fermé : un conseiller qui ouvre l'agenda le dimanche
    // regarde les jours à venir, pas ceux qui viennent de s'écouler.
    expect(lundiCourant("2026-09-13")).toBe("2026-09-14");
    // Là où la semaine ISO, elle, rattache ce dimanche à la semaine écoulée.
    expect(lundiDeLaSemaine("2026-09-13")).toBe("2026-09-07");
  });

  it("passe au mois suivant quand le dimanche le termine", () => {
    // 2026-11-29 est un dimanche.
    expect(lundiCourant("2026-11-29")).toBe("2026-11-30");
  });

  it("refuse une date invalide comme `lundiDeLaSemaine`", () => {
    expect(lundiCourant("2026-02-31")).toBeNull();
    expect(lundiCourant("")).toBeNull();
  });
});

describe("ajouterJours", () => {
  it("avance et recule d'une semaine", () => {
    expect(ajouterJours("2026-09-07", 7)).toBe("2026-09-14");
    expect(ajouterJours("2026-09-07", -7)).toBe("2026-08-31");
  });

  it("traverse un changement d'année", () => {
    expect(ajouterJours("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("n'est pas troublé par le changement de fuseau", () => {
    // Une semaine calendaire reste sept jours, même celle du 16 mars 2026.
    expect(ajouterJours("2026-03-16", 7)).toBe("2026-03-23");
  });
});

describe("rangDansLaSemaine", () => {
  it("numérote les jours à partir du lundi", () => {
    expect(rangDansLaSemaine("2026-09-07", "2026-09-07")).toBe(0);
    expect(rangDansLaSemaine("2026-09-07", "2026-09-11")).toBe(4);
    expect(rangDansLaSemaine("2026-09-07", "2026-09-13")).toBe(6);
  });

  it("reste juste en traversant le changement de fuseau", () => {
    // Dimanche 22 mars, jour du retour à UTC+1 : compter en heures donnerait 6,96.
    expect(rangDansLaSemaine("2026-03-16", "2026-03-22")).toBe(6);
  });
});

describe("bornesSemaine", () => {
  it("borne une semaine ordinaire à minuit heure du cabinet", () => {
    expect(bornesSemaine("2026-09-07")).toEqual({
      debut: "2026-09-06T23:00:00.000Z",
      fin: "2026-09-13T23:00:00.000Z",
    });
  });

  it("convertit chaque borne à sa propre date", () => {
    // La semaine du 16 mars 2026 commence à UTC+0 et finit à UTC+1 : elle dure
    // 167 heures, pas 168. Ajouter sept jours au premier instant ferait entrer
    // dans la vue un rendez-vous du lundi suivant.
    const bornes = bornesSemaine("2026-03-16");
    expect(bornes).toEqual({
      debut: "2026-03-16T00:00:00.000Z",
      fin: "2026-03-22T23:00:00.000Z",
    });
    const duree = Date.parse(bornes!.fin) - Date.parse(bornes!.debut);
    expect(duree).toBe(167 * 3_600_000);
  });
});
