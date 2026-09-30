import { describe, it, expect } from "vitest";
import { jalonSuivant, libelleType, refusChangement } from "./parcours";

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

/** Le verrou des commandes du suivi : ce qui est grisé à l'écran et refusé au serveur. */
describe("refusChangement", () => {
  const maintenant = new Date("2026-09-29T12:00:00Z");
  const passe = "2026-09-01T10:00:00Z";
  const futur = "2026-10-15T10:00:00Z";
  const r0 = { id: "a", type: "R0", status: "termine", date: passe };
  const r1 = { id: "b", type: "R1", status: "planifie", date: futur };

  it("refuse d'annuler ou de rouvrir le R0 quand le R1 est posé", () => {
    expect(refusChangement([r0, r1], "a", "annule", maintenant)).toMatch(/suivante/);
    expect(refusChangement([r0, r1], "a", "confirme", maintenant)).toMatch(/suivante/);
  });

  it("laisse annuler le R1, ou le R0 quand rien ne suit", () => {
    expect(refusChangement([r0, r1], "b", "annule", maintenant)).toBeNull();
    expect(refusChangement([r0], "a", "annule", maintenant)).toBeNull();
  });

  it("n'ignore pas un autre R0 terminé", () => {
    const autre = { ...r0, id: "c" };
    expect(refusChangement([r0, autre, r1], "a", "annule", maintenant)).toBeNull();
  });

  it("refuse de rétablir un doublon", () => {
    const annule = { id: "c", type: "R0", status: "annule", date: passe };
    expect(refusChangement([r0, annule], "c", "confirme", maintenant)).toMatch(/Un autre R0/);
  });

  it("ne constate pas un rendez-vous à venir", () => {
    expect(refusChangement([r0, r1], "b", "termine", maintenant)).toMatch(/pas encore eu lieu/);
    expect(refusChangement([r0, r1], "b", "non_honore", maintenant)).toMatch(/pas encore/);
  });

  it("ne bloque pas un dossier déjà incohérent", () => {
    const annule = { ...r0, status: "annule" };
    expect(refusChangement([annule, r1], "b", "annule", maintenant)).toBeNull();
    expect(refusChangement([annule, r1], "a", "confirme", maintenant)).toBeNull();
  });
});
