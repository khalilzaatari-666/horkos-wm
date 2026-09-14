import { describe, it, expect } from "vitest";
import { titreRendezVous, dureeRendezVous, libelleDuree, DUREES } from "./rendez-vous";

/**
 * L'intitulé et la durée sont recopiés à quatre endroits qui ne se parlent pas
 * (agenda Google, invitation ICS, emails, back-office) et, pour la durée, dans
 * une fonction SQL. Ce test est le point où les trois formats exacts et les
 * trois durées sont fixés une bonne fois.
 */
describe("titreRendezVous", () => {
  it("nomme le R0 avec son étape et son libellé", () => {
    expect(titreRendezVous("R0", "Amine Benali")).toBe(
      "R0 Horkos Wealth Management - Audit patrimonial - Amine Benali"
    );
  });

  it("nomme le R1 avec la stratégie d'investissement", () => {
    expect(titreRendezVous("R1", "Amine Benali")).toBe(
      "R1 Horkos Wealth Management - Stratégie d'investissement - Amine Benali"
    );
  });

  it("ne donne aucun libellé au R2", () => {
    expect(titreRendezVous("R2", "Amine Benali")).toBe(
      "R2 Horkos Wealth Management - Amine Benali"
    );
  });

  it("omet le nom quand il n'est pas fourni", () => {
    expect(titreRendezVous("R0")).toBe("R0 Horkos Wealth Management - Audit patrimonial");
    expect(titreRendezVous("R2", "   ")).toBe("R2 Horkos Wealth Management");
  });

  it("ne préfixe pas de code ce qui n'est pas une étape du parcours", () => {
    expect(titreRendezVous("revue", "Amine Benali")).toBe(
      "Horkos Wealth Management - Point de suivi - Amine Benali"
    );
    expect(titreRendezVous("autre", "Amine Benali")).toBe(
      "Horkos Wealth Management - Échange - Amine Benali"
    );
  });
});

describe("dureeRendezVous", () => {
  it("applique les durées de chaque étape", () => {
    expect(dureeRendezVous("R0")).toBe(45);
    expect(dureeRendezVous("R1")).toBe(90);
    expect(dureeRendezVous("R2")).toBe(60);
  });

  it("retombe sur une heure pour un type inconnu", () => {
    expect(dureeRendezVous("revue")).toBe(60);
    expect(dureeRendezVous("écrit à la main")).toBe(60);
  });

  // Miroir de `_booking_duration` dans la migration 024 : si l'une change,
  // l'autre doit changer, et ce test est là pour le rappeler.
  it("garde les mêmes valeurs que la fonction SQL", () => {
    expect(DUREES).toMatchObject({ R0: 45, R1: 90, R2: 60, revue: 60, autre: 60 });
  });
});

describe("libelleDuree", () => {
  it("écrit les durées telles qu'on les lit dans un email", () => {
    expect(libelleDuree(45)).toBe("45 minutes");
    expect(libelleDuree(60)).toBe("1 heure");
    expect(libelleDuree(90)).toBe("1 h 30");
    expect(libelleDuree(120)).toBe("2 heures");
  });
});
