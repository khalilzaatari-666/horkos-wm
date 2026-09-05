import { describe, it, expect } from "vitest";
import { actifsDeLaFiche, reconcilier, type ActifExistant } from "./assets";
import { ficheVide, type FicheAudit } from "./schema";

function fiche(modif: (f: FicheAudit) => void): FicheAudit {
  const f = ficheVide();
  modif(f);
  return f;
}

const ligne = (valeur: number, type = "opcvm", libelle = "") => ({
  detenteur: "",
  type,
  libelle,
  valeur,
  dateSouscription: "",
  remarques: "",
});

describe("actifsDeLaFiche", () => {
  it("reverse les lignes financières valorisées", () => {
    const f = fiche((x) => {
      x.financier = [ligne(250000, "opcvm", "OPCVM actions"), ligne(80000, "liquidites")];
    });
    expect(actifsDeLaFiche(f)).toEqual([
      { cle: "financier:0", type: "opcvm", label: "OPCVM actions", valeur: 250000 },
      { cle: "financier:1", type: "liquidites", label: "Liquidités", valeur: 80000 },
    ]);
  });

  it("ignore une ligne non valorisée", () => {
    // Une ligne à zéro est une ligne en cours de saisie, pas un actif sans valeur.
    const f = fiche((x) => {
      x.financier = [ligne(0), ligne(1000)];
    });
    expect(actifsDeLaFiche(f).map((a) => a.cle)).toEqual(["financier:1"]);
  });

  it("garde la clé d'origine même si une ligne précédente est vide", () => {
    // Les clés suivent l'index de saisie : sinon, vider une ligne ferait glisser
    // toutes les suivantes et l'historique des valorisations changerait d'actif.
    const f = fiche((x) => {
      x.financier = [ligne(0), ligne(0), ligne(5000)];
    });
    expect(actifsDeLaFiche(f)[0].cle).toBe("financier:2");
  });

  it("porte la résidence principale et les biens locatifs", () => {
    const vide = ficheVide();
    const f = fiche((x) => {
      x.immobilier.residencePrincipale = {
        ...x.immobilier.residencePrincipale,
        adresse: "12 rue des Orangers",
        valeurEstimee: 1800000,
      };
      x.immobilier.locatifs = [{ ...vide.immobilier.residencePrincipale, valeurEstimee: 900000 }];
    });
    expect(actifsDeLaFiche(f)).toEqual([
      {
        cle: "immobilier:residence-principale",
        type: "immobilier",
        label: "Résidence principale - 12 rue des Orangers",
        valeur: 1800000,
      },
      { cle: "immobilier:locatif:0", type: "immobilier", label: "Bien locatif 1", valeur: 900000 },
    ]);
  });

  it("nomme une ligne sans libellé par son type", () => {
    const f = fiche((x) => {
      x.financier = [ligne(1000, "assurance_vie")];
    });
    expect(actifsDeLaFiche(f)[0].label).toBe("Assurance-vie");
  });

  it("range une ligne sans type dans « autre »", () => {
    const f = fiche((x) => {
      x.financier = [ligne(1000, "", "Compte à terme BMCE")];
    });
    expect(actifsDeLaFiche(f)[0]).toMatchObject({ type: "autre", label: "Compte à terme BMCE" });
  });

  it("ne rend rien pour une fiche vide", () => {
    expect(actifsDeLaFiche(ficheVide())).toEqual([]);
  });
});

describe("reconcilier", () => {
  const existant = (cle: string, valeur: number): ActifExistant => ({ id: `id-${cle}`, cle, valeur });

  it("crée ce qui n'existe pas encore", () => {
    const r = reconcilier([{ cle: "financier:0", type: "opcvm", label: "A", valeur: 100 }], []);
    expect(r.aCreer).toHaveLength(1);
    expect(r.aMettreAJour).toEqual([]);
    expect(r.aSupprimer).toEqual([]);
  });

  it("met à jour ce qui existe, sans le recréer", () => {
    const r = reconcilier(
      [{ cle: "financier:0", type: "opcvm", label: "A", valeur: 200 }],
      [existant("financier:0", 100)]
    );
    expect(r.aCreer).toEqual([]);
    expect(r.aMettreAJour).toHaveLength(1);
    expect(r.aMettreAJour[0].existant.id).toBe("id-financier:0");
    expect(r.aMettreAJour[0].actif.valeur).toBe(200);
  });

  it("supprime l'actif d'une ligne retirée de la fiche", () => {
    // Un bien vendu et effacé de l'audit ne doit plus gonfler le patrimoine.
    const r = reconcilier([], [existant("immobilier:locatif:0", 900000)]);
    expect(r.aSupprimer.map((a) => a.id)).toEqual(["id-immobilier:locatif:0"]);
  });

  it("traite création, mise à jour et suppression en un seul passage", () => {
    const r = reconcilier(
      [
        { cle: "financier:0", type: "opcvm", label: "A", valeur: 200 },
        { cle: "financier:2", type: "actions", label: "C", valeur: 300 },
      ],
      [existant("financier:0", 100), existant("financier:1", 50)]
    );
    expect(r.aCreer.map((a) => a.cle)).toEqual(["financier:2"]);
    expect(r.aMettreAJour.map((m) => m.actif.cle)).toEqual(["financier:0"]);
    expect(r.aSupprimer.map((a) => a.cle)).toEqual(["financier:1"]);
  });
});
