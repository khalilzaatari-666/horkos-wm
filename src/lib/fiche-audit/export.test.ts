import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { classeurRempli, nomFichierAudit } from "./export";
import { ficheVide, type FicheAudit } from "./schema";
import { calculer } from "./calculs";

const GABARIT = join(process.cwd(), "docs", "modele-audit.xlsx");
const gabarit = () => new Uint8Array(readFileSync(GABARIT));

/** Nom interne des feuilles, dans l'ordre du classeur. */
const FEUILLES = {
  REVENUS: "xl/worksheets/sheet1.xml",
  IMMOBILIER: "xl/worksheets/sheet2.xml",
  FINANCIER: "xl/worksheets/sheet3.xml",
  OBJECTIFS: "xl/worksheets/sheet5.xml",
  SIMULATEUR: "xl/worksheets/sheet6.xml",
};

function cellule(classeur: Uint8Array, feuille: string, ref: string): string | null {
  const xml = strFromU8(unzipSync(classeur)[feuille]);
  const m = new RegExp(`<c[^>]*?\\br="${ref}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`).exec(xml);
  return m?.[0] ?? null;
}

/** Valeur lisible d'une cellule : nombre brut ou texte en ligne. */
function valeur(classeur: Uint8Array, feuille: string, ref: string): string | null {
  const c = cellule(classeur, feuille, ref);
  if (!c) return null;
  const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(c);
  if (inline) return inline[1];
  const v = /<v>([\s\S]*?)<\/v>/.exec(c);
  return v ? v[1] : null;
}

function ficheRemplie(): FicheAudit {
  const f = ficheVide();
  f.titulaire = {
    ...f.titulaire,
    nom: "Zaatari",
    prenom: "Khalil",
    email: "k@example.ma",
    telephone: "0600000000",
    profession: "Ingénieur",
    revenuFixe: 480000,
    revenuVariable: 60000,
  };
  f.conjoint = { ...f.conjoint, nom: "Bennani", prenom: "Salma", revenuFixe: 240000 };
  f.foyer = { ...f.foyer, situationFamiliale: "Marié(e)", nbEnfants: 2, personnesACharge: 2 };
  f.immobilier.residencePrincipale = {
    ...f.immobilier.residencePrincipale,
    adresse: "12 rue des Orangers, Casablanca",
    situation: "Propriétaire",
    loyerMensualite: 6500,
    valeurEstimee: 1800000,
    capitalRestantDu: 700000,
  };
  f.financier = [
    {
      detenteur: "Khalil",
      type: "opcvm",
      libelle: "OPCVM actions",
      valeur: 250000,
      dateSouscription: "2021-03-01",
      remarques: "",
    },
    { detenteur: "", type: "liquidites", libelle: "", valeur: 80000, dateSouscription: "", remarques: "" },
  ];
  f.profil = {
    ...f.profil,
    usPerson: true,
    effortEpargne: 4000,
    objectifs: ["Préparer la retraite", "Protéger la famille"],
  };
  f.simulation = { montant: 200000, tauxHorsAssurance: 0.0495, dureeMois: 300 };
  return f;
}

describe("classeurRempli", () => {
  it("écrit l'état civil des deux colonnes du modèle", () => {
    const { classeur } = classeurRempli(gabarit(), ficheRemplie());
    expect(valeur(classeur, FEUILLES.REVENUS, "C3")).toBe("Zaatari");
    expect(valeur(classeur, FEUILLES.REVENUS, "C4")).toBe("Khalil");
    expect(valeur(classeur, FEUILLES.REVENUS, "H3")).toBe("Bennani");
    expect(valeur(classeur, FEUILLES.REVENUS, "H4")).toBe("Salma");
  });

  it("sépare le fixe du variable, sans écrire le brut annuel", () => {
    // D21 est la formule `=D20+F20` du modèle : y poser une valeur reviendrait à
    // figer un total qui peut contredire ses propres composantes.
    const { classeur } = classeurRempli(gabarit(), ficheRemplie());
    expect(valeur(classeur, FEUILLES.REVENUS, "D20")).toBe("480000");
    expect(valeur(classeur, FEUILLES.REVENUS, "F20")).toBe("60000");
    expect(cellule(classeur, FEUILLES.REVENUS, "D21")).toContain("<f>");
    expect(cellule(classeur, FEUILLES.REVENUS, "D21")).not.toContain("<v>");
  });

  it("remplace les intitulés français par leur équivalent marocain", () => {
    const { classeur } = classeurRempli(gabarit(), ficheVide());
    expect(valeur(classeur, FEUILLES.REVENUS, "B10")).toBe("Personnes à charge");
    expect(valeur(classeur, FEUILLES.SIMULATEUR, "B13")).toBe("Investissement OPCI");
    expect(valeur(classeur, FEUILLES.SIMULATEUR, "C13")).toContain("OPCI");
  });

  it("passe les formats monétaires en dirhams", () => {
    const { classeur } = classeurRempli(gabarit(), ficheVide());
    const styles = strFromU8(unzipSync(classeur)["xl/styles.xml"]);
    const numFmts = /<numFmts[\s\S]*?<\/numFmts>/.exec(styles)?.[0] ?? "";
    expect(numFmts).toContain("MAD");
    expect(numFmts).not.toContain("€");
  });

  it("écrit les lignes financières et efface les produits pré-imprimés du modèle", () => {
    // Le gabarit arrive avec « Livret A », « PEA »… en dur : les laisser
    // ferait figurer des produits français sur la fiche d'un client marocain.
    const { classeur } = classeurRempli(gabarit(), ficheRemplie());
    expect(valeur(classeur, FEUILLES.FINANCIER, "C5")).toBe("OPCVM actions");
    expect(valeur(classeur, FEUILLES.FINANCIER, "D5")).toBe("250000");
    expect(valeur(classeur, FEUILLES.FINANCIER, "C6")).toBe("Liquidités");
    expect(valeur(classeur, FEUILLES.FINANCIER, "C7")).toBeNull();
    expect(valeur(classeur, FEUILLES.FINANCIER, "C13")).toBeNull();
  });

  it("laisse le total financier à la charge d'Excel", () => {
    const { classeur } = classeurRempli(gabarit(), ficheRemplie());
    const total = cellule(classeur, FEUILLES.FINANCIER, "D26");
    expect(total).toContain("SUM(D5:D25)");
    expect(total).not.toContain("<v>");
  });

  it("corrige le double comptage du revenu du conjoint", () => {
    // Dans le modèle, E5 (« Revenus Mr ») pointe sur le net du foyer, que D5
    // additionne ensuite au net du conjoint. On y écrit le net du titulaire.
    const fiche = ficheRemplie();
    const { classeur } = classeurRempli(gabarit(), fiche);
    const attendu = calculer(fiche).netMensuelTitulaire;
    expect(Number(valeur(classeur, FEUILLES.SIMULATEUR, "E5"))).toBeCloseTo(attendu, 6);
  });

  it("reporte les objectifs ligne à ligne et les réponses KYC", () => {
    const { classeur } = classeurRempli(gabarit(), ficheRemplie());
    expect(valeur(classeur, FEUILLES.OBJECTIFS, "C3")).toBe("Oui");
    expect(valeur(classeur, FEUILLES.OBJECTIFS, "E3")).toBe("Non");
    expect(valeur(classeur, FEUILLES.OBJECTIFS, "D7")).toBe("4000");
    expect(valeur(classeur, FEUILLES.OBJECTIFS, "B12")).toBe("Préparer la retraite");
    expect(valeur(classeur, FEUILLES.OBJECTIFS, "B13")).toBe("Protéger la famille");
  });

  it("n'écrit rien pour un montant nul", () => {
    // Une case vide se lit mieux qu'un « 0 MAD » qui ressemble à une saisie.
    const { classeur } = classeurRempli(gabarit(), ficheVide());
    expect(valeur(classeur, FEUILLES.IMMOBILIER, "D7")).toBeNull();
  });

  it("signale ce que le modèle ne peut pas accueillir", () => {
    const fiche = ficheVide();
    const bien = { ...ficheVide().immobilier.residencePrincipale };
    fiche.immobilier.locatifs = [bien, bien, bien];
    fiche.immobilier.credits = [
      { designation: "a", capitalEmprunte: 0, capitalRestantDu: 0, mensualites: 0, duree: "" },
      { designation: "b", capitalEmprunte: 0, capitalRestantDu: 0, mensualites: 0, duree: "" },
      { designation: "c", capitalEmprunte: 0, capitalRestantDu: 0, mensualites: 0, duree: "" },
    ];
    const { omissions } = classeurRempli(gabarit(), fiche);
    expect(omissions).toEqual([
      "2 bien(s) locatif(s) au-delà de ce que le modèle prévoit",
      "1 crédit(s) au-delà de ce que le modèle prévoit",
    ]);
  });

  it("produit un classeur qu'un lecteur peut rouvrir", () => {
    const { classeur } = classeurRempli(gabarit(), ficheRemplie());
    const entrees = unzipSync(classeur);
    expect(Object.keys(entrees)).toContain("xl/workbook.xml");
    expect(strFromU8(entrees["xl/workbook.xml"])).toContain('fullCalcOnLoad="1"');
    expect(classeur.byteLength).toBeGreaterThan(10000);
  });
});

describe("nomFichierAudit", () => {
  it("compose un nom de fichier sûr et daté", () => {
    const f = ficheVide();
    f.titulaire.prenom = "Khalil";
    f.titulaire.nom = "Zaatari";
    expect(nomFichierAudit(f, new Date("2026-09-03T10:00:00Z"))).toBe(
      "audit-khalil-zaatari-2026-09-03.xlsx"
    );
  });

  it("retire accents et caractères hors alphabet", () => {
    const f = ficheVide();
    f.titulaire.prenom = "Amélie";
    f.titulaire.nom = "O'Brien/Sé";
    expect(nomFichierAudit(f, new Date("2026-01-05T00:00:00Z"))).toBe(
      "audit-amelie-obriense-2026-01-05.xlsx"
    );
  });

  it("reste valide sans nom de client", () => {
    expect(nomFichierAudit(ficheVide(), new Date("2026-01-05T00:00:00Z"))).toBe(
      "audit-client-2026-01-05.xlsx"
    );
  });
});
