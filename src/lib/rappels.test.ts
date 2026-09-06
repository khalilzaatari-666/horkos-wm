import { describe, it, expect } from "vitest";
import {
  echeance,
  libelleDelai,
  QUANTITE_MAX,
  HORIZON_MAX_MOIS,
  UNITES,
} from "./rappels";

const LE_8_SEPT = new Date("2026-09-08T10:00:00.000Z");

describe("echeance", () => {
  it("compte les heures en temps absolu", () => {
    expect(echeance(LE_8_SEPT, 2, "heures")?.toISOString()).toBe("2026-09-08T12:00:00.000Z");
    expect(echeance(LE_8_SEPT, 48, "heures")?.toISOString()).toBe("2026-09-10T10:00:00.000Z");
  });

  it("compte les jours en temps absolu", () => {
    expect(echeance(LE_8_SEPT, 3, "jours")?.toISOString()).toBe("2026-09-11T10:00:00.000Z");
  });

  it("garde le quantième pour les mois, plutôt que d'ajouter trente jours", () => {
    // « Dans deux mois » veut dire la même date deux mois plus loin. Compter en
    // jours donnerait le 7 novembre, ce qui n'est pas ce qu'on a demandé.
    expect(echeance(LE_8_SEPT, 2, "mois")?.toISOString()).toBe("2026-11-08T10:00:00.000Z");
  });

  it("donne le même résultat quel que soit le fuseau de la machine", () => {
    // Le calcul se fait en UTC : `setMonth` aurait lu le fuseau local, et le
    // serveur Vercel (UTC) n'aurait pas répondu comme un poste à Casablanca.
    // Septembre → novembre traverse le changement d'heure européen, qui est
    // exactement là où l'écart apparaîtrait.
    expect(echeance(LE_8_SEPT, 2, "mois")?.getUTCHours()).toBe(10);
    expect(echeance(LE_8_SEPT, 2, "mois")?.getUTCDate()).toBe(8);
  });

  it("traverse un changement d'année", () => {
    expect(echeance(new Date("2026-11-20T09:00:00.000Z"), 3, "mois")?.toISOString()).toBe(
      "2027-02-20T09:00:00.000Z"
    );
  });

  it("reporte une fin de mois qui n'existe pas au mois suivant", () => {
    // 31 janvier + 1 mois : le 31 février n'existe pas, `setMonth` déborde sur
    // mars. Sans conséquence pour un pense-bête - mais constaté, pas subi.
    expect(echeance(new Date("2026-01-31T09:00:00.000Z"), 1, "mois")?.toISOString()).toBe(
      "2026-03-03T09:00:00.000Z"
    );
  });

  it("refuse une quantité nulle ou négative", () => {
    expect(echeance(LE_8_SEPT, 0, "jours")).toBeNull();
    expect(echeance(LE_8_SEPT, -3, "jours")).toBeNull();
  });

  it("refuse une quantité qui n'est pas un entier", () => {
    expect(echeance(LE_8_SEPT, 1.5, "jours")).toBeNull();
    expect(echeance(LE_8_SEPT, Number.NaN, "heures")).toBeNull();
  });

  it("refuse au-delà de l'horizon maximal", () => {
    expect(echeance(LE_8_SEPT, HORIZON_MAX_MOIS, "mois")).not.toBeNull();
    expect(echeance(LE_8_SEPT, HORIZON_MAX_MOIS + 1, "mois")).toBeNull();
  });

  it("borne aussi les heures et les jours", () => {
    for (const unite of UNITES) {
      expect(echeance(LE_8_SEPT, QUANTITE_MAX[unite], unite)).not.toBeNull();
      expect(echeance(LE_8_SEPT, QUANTITE_MAX[unite] + 1, unite)).toBeNull();
    }
  });

  it("refuse une date de départ invalide", () => {
    expect(echeance(new Date("pas une date"), 1, "jours")).toBeNull();
  });

  it("ne modifie pas la date reçue", () => {
    const depart = new Date(LE_8_SEPT.getTime());
    echeance(depart, 5, "mois");
    expect(depart.toISOString()).toBe(LE_8_SEPT.toISOString());
  });
});

describe("libelleDelai", () => {
  it("accorde le singulier et le pluriel", () => {
    expect(libelleDelai(1, "heures")).toBe("1 heure");
    expect(libelleDelai(3, "heures")).toBe("3 heures");
    expect(libelleDelai(1, "jours")).toBe("1 jour");
    expect(libelleDelai(2, "jours")).toBe("2 jours");
  });

  it("laisse « mois » invariable", () => {
    expect(libelleDelai(1, "mois")).toBe("1 mois");
    expect(libelleDelai(6, "mois")).toBe("6 mois");
  });
});
