import { describe, it, expect } from "vitest";
import { calculer, mensualitePret, brutAnnuel, SEUILS } from "./calculs";
import { ficheVide, type FicheAudit } from "./schema";

/** Une fiche vide dans laquelle on ne pose que ce que le test regarde. */
function fiche(modif: (f: FicheAudit) => void): FicheAudit {
  const f = ficheVide();
  modif(f);
  return f;
}

describe("mensualitePret", () => {
  it("retrouve le PMT du classeur du cabinet", () => {
    // Le modèle affiche 1 163,36 pour 200 000 à 4,95 % sur 300 mois : c'est le
    // repère qui prouve que la formule réécrite vaut celle d'Excel.
    expect(mensualitePret(200000, 0.0495, 300)).toBeCloseTo(1163.3612300100237, 6);
  });

  it("dégénère en simple division à taux nul", () => {
    expect(mensualitePret(120000, 0, 240)).toBe(500);
  });

  it("vaut zéro sans montant ni durée", () => {
    expect(mensualitePret(0, 0.05, 240)).toBe(0);
    expect(mensualitePret(100000, 0.05, 0)).toBe(0);
  });
});

describe("brutAnnuel", () => {
  it("additionne le fixe et le variable", () => {
    const f = fiche((x) => {
      x.titulaire.revenuFixe = 400000;
      x.titulaire.revenuVariable = 80000;
    });
    expect(brutAnnuel(f.titulaire)).toBe(480000);
  });
});

describe("endettement", () => {
  it("rapporte la charge de logement au net du foyer", () => {
    const f = fiche((x) => {
      x.titulaire.revenuFixe = 480000; // net mensuel = 480000*0,77/12 = 30 800
      x.immobilier.residencePrincipale.loyerMensualite = 7700;
    });
    const c = calculer(f);
    expect(c.endettement.revenuMensuelNet).toBeCloseTo(30800, 6);
    expect(c.endettement.apresRevenus).toBeCloseTo(0.25, 6);
  });

  it("compte le net des deux membres du foyer", () => {
    const f = fiche((x) => {
      x.titulaire.revenuFixe = 480000;
      x.conjoint.revenuFixe = 240000;
    });
    expect(calculer(f).endettement.revenuMensuelNet).toBeCloseTo(46200, 6);
  });

  it("ne retient que 70 % des loyers perçus", () => {
    const f = fiche((x) => {
      x.immobilier.locatifs = [
        { ...ficheVide().immobilier.residencePrincipale, loyersPercus: 10000, mensualites: 0 },
      ];
    });
    const c = calculer(f);
    expect(c.endettement.loyersPercus).toBe(10000);
    expect(c.endettement.loyersRetenus).toBeCloseTo(7000, 6);
  });

  it("agrège tous les crédits dans le taux total", () => {
    const vide = ficheVide();
    const f = fiche((x) => {
      x.titulaire.revenuFixe = 480000; // net 30 800
      x.immobilier.residencePrincipale.loyerMensualite = 5000;
      x.immobilier.locatifs = [
        { ...vide.immobilier.residencePrincipale, mensualites: 3000, loyersPercus: 0 },
      ];
      x.immobilier.credits = [
        { designation: "Auto", capitalEmprunte: 0, capitalRestantDu: 0, mensualites: 1800, duree: "" },
      ];
    });
    // (5000 + 3000 + 1800) / 30800
    expect(calculer(f).endettement.total).toBeCloseTo(9800 / 30800, 6);
  });

  it("rend null plutôt qu'une division par zéro quand il n'y a aucun revenu", () => {
    // Une fiche à peine commencée ne doit pas afficher « Infinity % ».
    const c = calculer(ficheVide());
    expect(c.endettement.apresRevenus).toBeNull();
    expect(c.endettement.total).toBeNull();
  });

  it("totalise le capital restant dû de tous les emprunts", () => {
    const vide = ficheVide();
    const f = fiche((x) => {
      x.immobilier.residencePrincipale.capitalRestantDu = 500000;
      x.immobilier.locatifs = [{ ...vide.immobilier.residencePrincipale, capitalRestantDu: 300000 }];
      x.immobilier.credits = [
        { designation: "Auto", capitalEmprunte: 0, capitalRestantDu: 90000, mensualites: 0, duree: "" },
      ];
    });
    expect(calculer(f).endettement.capitalRestantDuTotal).toBe(890000);
  });
});

describe("patrimoine", () => {
  it("somme le financier et l'immobilier, et retranche les dettes", () => {
    const f = fiche((x) => {
      x.financier = [
        { detenteur: "", type: "opcvm", libelle: "", valeur: 250000, dateSouscription: "", remarques: "" },
        { detenteur: "", type: "liquidites", libelle: "", valeur: 50000, dateSouscription: "", remarques: "" },
      ];
      x.immobilier.residencePrincipale.valeurEstimee = 1200000;
      x.immobilier.residencePrincipale.capitalRestantDu = 400000;
    });
    const c = calculer(f);
    expect(c.totalFinancier).toBe(300000);
    expect(c.totalImmobilier).toBe(1200000);
    expect(c.patrimoineBrut).toBe(1500000);
    expect(c.patrimoineNet).toBe(1100000);
  });
});

describe("simulation", () => {
  it("ne compte le revenu du conjoint qu'une fois", () => {
    // Le classeur d'origine additionne le net du foyer et, de nouveau, celui du
    // conjoint : la cellule « Revenus Mr » y pointe sur le total. Corrigé ici,
    // sans quoi tous les ratios d'un couple sont flattés.
    const f = fiche((x) => {
      x.titulaire.revenuFixe = 480000; // net 30 800
      x.conjoint.revenuFixe = 240000; // net 15 400
      x.simulation.montant = 200000;
      x.simulation.tauxHorsAssurance = 0.0495;
      x.simulation.dureeMois = 300;
    });
    const c = calculer(f);
    const revenusRetenus = 46200 + c.simulation.revenusProduitRetenus;
    expect(c.simulation.tauxEndettement).toBeCloseTo(c.simulation.mensualite / revenusRetenus, 6);
  });

  it("retient 70 % du rendement OPCI fixe de 5,5 %, jamais un autre taux", () => {
    const f = fiche((x) => {
      x.simulation.montant = 240000;
    });
    // 240000 * 5,5 % / 12 * 70 % - 5,5 % n'est pas un paramètre de la fiche,
    // c'est une constante du produit simulé (cf. calculs.ts).
    expect(calculer(f).simulation.revenusProduitRetenus).toBeCloseTo(770, 6);
  });

  it("admet un passif plus lourd chez un propriétaire", () => {
    const base = (situation: "Propriétaire" | "Locataire") =>
      calculer(
        fiche((x) => {
          x.titulaire.revenuFixe = 480000;
          x.immobilier.residencePrincipale.situation = situation;
          x.simulation.montant = 200000;
        })
      ).simulation.ratioPassif;

    // 8 fois le revenu annuel net contre 5.
    expect(base("Propriétaire")).toBeCloseTo(8 * 30800 * 12 - 200000, 4);
    expect(base("Locataire")).toBeCloseTo(5 * 30800 * 12 - 200000, 4);
  });

  it("relève le restant à vivre minimum selon le foyer", () => {
    const seul = calculer(ficheVide()).simulation.restantAVivreMinimum;
    expect(seul).toBe(SEUILS.restantSeul);

    const famille = calculer(
      fiche((x) => {
        x.foyer.situationFamiliale = "Marié(e)";
        x.foyer.nbEnfants = 2;
      })
    ).simulation.restantAVivreMinimum;
    expect(famille).toBe(SEUILS.restantCouple + 2 * SEUILS.restantParEnfant);
  });

  it("juge les quatre ratios du modèle", () => {
    const c = calculer(
      fiche((x) => {
        x.titulaire.revenuFixe = 1200000; // net mensuel 77 000
        x.financier = [
          { detenteur: "", type: "liquidites", libelle: "", valeur: 60000, dateSouscription: "", remarques: "" },
        ];
        x.simulation.montant = 200000;
        x.simulation.tauxHorsAssurance = 0.0495;
        x.simulation.dureeMois = 300;
      })
    );
    const libelles = c.simulation.verdicts.map((v) => v.libelle);
    expect(libelles).toEqual([
      "Taux d'endettement après opération",
      "Ratio passif",
      "Restant à vivre",
      "Ratio d'épargne",
    ]);
    // Revenus confortables, aucun crédit : tout doit passer.
    expect(c.simulation.verdicts.every((v) => v.conforme === true)).toBe(true);
  });

  it("ne tranche pas un ratio qu'il ne peut pas calculer", () => {
    // Sans montant d'investissement, le ratio d'épargne n'a pas de sens : ni
    // conforme ni non conforme.
    const c = calculer(ficheVide());
    const epargne = c.simulation.verdicts.find((v) => v.libelle === "Ratio d'épargne");
    expect(epargne?.conforme).toBeNull();
    expect(epargne?.valeur).toBe("—");
  });
});
