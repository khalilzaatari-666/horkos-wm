import { describe, it, expect } from "vitest";
import { profilComplet, type ProfilMinimal } from "./intake";

function profil(over: Partial<ProfilMinimal> = {}): ProfilMinimal {
  return {
    role: "client",
    first_name: "Amine",
    last_name: "Berrada",
    phone: "+212 661204578",
    intakeRempli: true,
    ...over,
  };
}

describe("profilComplet", () => {
  it("ouvre l'espace à un client complet", () => {
    expect(profilComplet(profil())).toBe(true);
  });

  it("ferme la porte tant que le questionnaire manque", () => {
    // Le cas du compte créé par Google : nom repris du fournisseur, mais aucun
    // questionnaire - c'est précisément ce que la porte doit attraper.
    expect(profilComplet(profil({ intakeRempli: false }))).toBe(false);
  });

  it("ferme la porte sans téléphone", () => {
    // Aucun parcours d'inscription ne le demandait, ni par email ni par OAuth.
    expect(profilComplet(profil({ phone: null }))).toBe(false);
    expect(profilComplet(profil({ phone: "" }))).toBe(false);
    expect(profilComplet(profil({ phone: "   " }))).toBe(false);
  });

  it("ferme la porte sans nom ni prénom", () => {
    expect(profilComplet(profil({ first_name: null }))).toBe(false);
    expect(profilComplet(profil({ last_name: null }))).toBe(false);
    expect(profilComplet(profil({ first_name: "  " }))).toBe(false);
  });

  it("laisse toujours passer l'équipe", () => {
    // Un conseiller qui jette un œil à l'espace client n'a pas de questionnaire
    // patrimonial à remplir - et l'enfermer dehors lui retirerait le lien vers
    // son propre back-office.
    for (const role of ["admin", "conseiller"]) {
      expect(profilComplet(profil({ role, first_name: null, phone: null, intakeRempli: false }))).toBe(
        true
      );
    }
  });

  it("traite un rôle absent comme un client", () => {
    // Profil illisible ou déclencheur en échec : on ferme, on ne suppose pas.
    expect(profilComplet(profil({ role: null, intakeRempli: false }))).toBe(false);
    expect(profilComplet(profil({ role: undefined, intakeRempli: false }))).toBe(false);
  });

  it("ne se laisse pas ouvrir par un rôle inventé", () => {
    expect(profilComplet(profil({ role: "staff", intakeRempli: false }))).toBe(false);
  });
});
