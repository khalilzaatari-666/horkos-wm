import { describe, it, expect } from "vitest";
import { jalonSuivant, libelleType } from "./parcours";

/**
 * `jalonSuivant` porte la règle que le back-office applique : une étape ne se
 * pose que si la précédente est terminée, et jamais deux fois. C'est la seule
 * barrière entre un conseiller pressé et un R2 posé avant le R1, donc elle est
 * verrouillée ici.
 */
describe("jalonSuivant", () => {
  it("commence par le R0 quand rien n'existe", () => {
    expect(jalonSuivant([])?.type).toBe("R0");
  });

  it("ne propose rien tant que l'étape en cours n'est pas terminée", () => {
    expect(jalonSuivant([{ type: "R0", status: "confirme" }])).toBeNull();
  });

  it("propose le R1 une fois le R0 terminé", () => {
    expect(jalonSuivant([{ type: "R0", status: "termine" }])?.type).toBe("R1");
  });

  it("ne double pas une étape déjà planifiée", () => {
    expect(
      jalonSuivant([
        { type: "R0", status: "termine" },
        { type: "R1", status: "planifie" },
      ])
    ).toBeNull();
  });

  it("ne saute pas le R1 pour aller au R2", () => {
    expect(
      jalonSuivant([
        { type: "R0", status: "termine" },
        { type: "R1", status: "annule" },
      ])?.type
    ).toBe("R1");
  });

  it("ne propose plus rien quand le parcours est complet", () => {
    expect(
      jalonSuivant([
        { type: "R0", status: "termine" },
        { type: "R1", status: "termine" },
        { type: "R2", status: "termine" },
      ])
    ).toBeNull();
  });

  it("ouvre l'étape suivante dès que le R0 en cours est projeté terminé", () => {
    // C'est le calcul que fait le suivi avant de proposer « R0 effectué -
    // planifier le R1 » : rien n'est écrit, on regarde l'état d'après.
    const rdvs = [{ id: "a", type: "R0", status: "confirme" }];
    expect(jalonSuivant(rdvs)).toBeNull();

    const projete = rdvs.map((r) => ({ ...r, status: "termine" }));
    expect(jalonSuivant(projete)?.type).toBe("R1");
  });

  it("ignore les rendez-vous hors parcours", () => {
    expect(
      jalonSuivant([
        { type: "R0", status: "termine" },
        { type: "revue", status: "confirme" },
      ])?.type
    ).toBe("R1");
  });
});

describe("libelleType", () => {
  it("reprend le titre du parcours pour les jalons", () => {
    expect(libelleType("R0")).toBe("Audit patrimonial");
  });

  it("nomme les rendez-vous hors parcours", () => {
    expect(libelleType("revue")).toBe("Point de suivi");
    expect(libelleType("autre")).toBe("Échange");
  });
});
