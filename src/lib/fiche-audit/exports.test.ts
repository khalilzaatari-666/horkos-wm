import { describe, it, expect, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { PDFDocument, PDFName } from "pdf-lib";

vi.mock("server-only", () => ({}));

import { ficheAuditSchema, ficheVide } from "./schema";
import { classeurAudit } from "./classeur";
import { pdfAudit } from "./pdf";
import { nomFichierAudit } from "./nom-fichier";

/**
 * La promesse de ces deux exports est l'exhaustivité : le gabarit qu'ils
 * remplacent s'arrêtait au premier bien locatif et au deuxième crédit, et
 * personne ne s'en apercevait avant de chercher le troisième. Les tests
 * chargent donc une fiche volontairement au-delà des anciennes limites.
 */
const fiche = ficheAuditSchema.parse({
  titulaire: { nom: "Bénali", prenom: "Amine", email: "amine@exemple.ma", revenuFixe: 960000 },
  conjoint: { nom: "Bénali", prenom: "Salma", revenuFixe: 540000 },
  foyer: { situationFamiliale: "Marié(e)", nbEnfants: 2 },
  fiscalite: {},
  immobilier: {
    residencePrincipale: { adresse: "12 rue des Orangers", situation: "Propriétaire", valeurEstimee: 3200000 },
    locatifs: Array.from({ length: 7 }, (_, i) => ({
      adresse: `Appartement ${i + 1}, Rabat`,
      valeurEstimee: 900000,
      loyersPercus: 5500,
    })),
    credits: Array.from({ length: 4 }, (_, i) => ({
      designation: `Crédit numéro ${i + 1}`,
      capitalRestantDu: 50000,
      mensualites: 2500,
    })),
  },
  financier: Array.from({ length: 26 }, (_, i) => ({
    type: "actions",
    libelle: `Placement ${i + 1}`,
    valeur: 100000,
  })),
  profil: { objectifs: ["Préparer la retraite", "Financer les études"] },
  simulation: { montant: 1500000, tauxHorsAssurance: 0.0495, dureeMois: 180 },
});

const DATE = new Date("2026-09-11T10:00:00Z");

function feuilles(classeur: Uint8Array): string {
  const zip = unzipSync(classeur);
  return Object.entries(zip)
    .filter(([nom]) => nom.startsWith("xl/worksheets/"))
    .map(([, u8]) => strFromU8(u8))
    .join("\n");
}

describe("classeurAudit", () => {
  it("écrit tous les biens locatifs, tous les crédits et toutes les lignes financières", () => {
    const xml = feuilles(classeurAudit(fiche, DATE));
    for (let i = 1; i <= 7; i++) expect(xml).toContain(`Appartement ${i}, Rabat`);
    for (let i = 1; i <= 4; i++) expect(xml).toContain(`Crédit numéro ${i}`);
    for (let i = 1; i <= 26; i++) expect(xml).toContain(`Placement ${i}`);
  });

  it("porte les totaux calculés plutôt que des formules", () => {
    const xml = feuilles(classeurAudit(fiche, DATE));
    // 7 biens à 900 000 + résidence principale à 3 200 000.
    expect(xml).toContain("<v>9500000</v>");
    // 26 placements à 100 000.
    expect(xml).toContain("<v>2600000</v>");
    expect(xml).not.toContain("<f>");
  });

  it("produit six feuilles, dans l'ordre de l'entretien", () => {
    const zip = unzipSync(classeurAudit(fiche, DATE));
    const workbook = strFromU8(zip["xl/workbook.xml"]);
    const noms = [...workbook.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
    expect(noms).toEqual([
      "Synthèse",
      "Foyer et revenus",
      "Immobilier",
      "Financier",
      "Objectifs",
      "Simulation",
    ]);
  });

  it("supporte une fiche vide sans produire de fichier cassé", () => {
    const zip = unzipSync(classeurAudit(ficheVide(), DATE));
    expect(Object.keys(zip)).toContain("xl/worksheets/sheet1.xml");
  });
});

/**
 * pdf-lib compresse ses objets : le fichier ne se lit pas comme du texte. On le
 * rouvre avec la même bibliothèque, ce qui vérifie au passage qu'il est valide.
 */
async function polices(pdf: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(pdf);
  const noms: string[] = [];
  for (const [, objet] of doc.context.enumerateIndirectObjects()) {
    const dict = objet as { get?: (cle: PDFName) => unknown };
    const base = dict.get?.(PDFName.of("BaseFont"));
    if (base) noms.push(String(base));
  }
  return noms;
}

describe("pdfAudit", () => {
  it("produit un PDF valide portant les polices du cabinet", async () => {
    const pdf = await pdfAudit(fiche, DATE);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    const noms = (await polices(pdf)).join(" ");
    expect(noms).toContain("CormorantGaramond");
    expect(noms).toContain("Inter");
  });

  it("tient sur plusieurs pages quand la fiche est longue", async () => {
    const doc = await PDFDocument.load(await pdfAudit(fiche, DATE));
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
  });

  it("supporte une fiche vide", async () => {
    const pdf = await pdfAudit(ficheVide(), DATE);
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });
});

describe("nomFichierAudit", () => {
  it("nomme les deux exports à l'identique, à l'extension près", () => {
    expect(nomFichierAudit(fiche, DATE, "xlsx")).toBe("audit-amine-benali-2026-09-11.xlsx");
    expect(nomFichierAudit(fiche, DATE, "pdf")).toBe("audit-amine-benali-2026-09-11.pdf");
  });

  it("retombe sur « client » sans nom", () => {
    expect(nomFichierAudit(ficheVide(), DATE, "pdf")).toBe("audit-client-2026-09-11.pdf");
  });
});
