import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import {
  remplirClasseur,
  ecrireCellule,
  viderCacheFormules,
  decouperReference,
} from "./classeur";

const GABARIT = join(process.cwd(), "docs", "modele-audit.xlsx");

function lireGabarit(): Uint8Array {
  return new Uint8Array(readFileSync(GABARIT));
}

/** Le XML d'une feuille du classeur produit, par chemin interne. */
function feuille(classeur: Uint8Array, chemin: string): string {
  return strFromU8(unzipSync(classeur)[chemin]);
}

/** Contenu brut d'une cellule dans un XML de feuille. */
function cellule(xml: string, ref: string): string | null {
  // Paresseux comme les motifs du module : gourmand, `[^>]*` avale le `/` d'une
  // cellule auto-fermée et la capture déborde sur la cellule suivante.
  const m = new RegExp(`<c[^>]*?\\br="${ref}"[^>]*?(?:/>|>[\\s\\S]*?</c>)`).exec(xml);
  return m?.[0] ?? null;
}

describe("decouperReference", () => {
  it("lit colonne et ligne", () => {
    expect(decouperReference("A1")).toEqual({ colonne: 1, ligne: 1 });
    expect(decouperReference("B5")).toEqual({ colonne: 2, ligne: 5 });
    expect(decouperReference("AA10")).toEqual({ colonne: 27, ligne: 10 });
  });

  it("rejette ce qui n'est pas une référence", () => {
    expect(decouperReference("B")).toBeNull();
    expect(decouperReference("1")).toBeNull();
    expect(decouperReference("$B$5")).toBeNull();
  });
});

describe("ecrireCellule", () => {
  const feuilleVide = `<worksheet><sheetData><row r="1"><c r="A1" s="3"/><c r="C1" s="4"><v>7</v></c></row><row r="3"><c r="A3"/></row></sheetData></worksheet>`;

  it("garde le style de la cellule remplacée", () => {
    // `s` porte la police, le fond jaune des cases à saisir et le format
    // monétaire : l'écraser écrirait la bonne valeur dans une cellule nue.
    const xml = ecrireCellule(feuilleVide, "A1", 1234);
    expect(cellule(xml, "A1")).toBe(`<c r="A1" s="3"><v>1234</v></c>`);
  });

  it("remplace une valeur existante", () => {
    const xml = ecrireCellule(feuilleVide, "C1", 9);
    expect(cellule(xml, "C1")).toBe(`<c r="C1" s="4"><v>9</v></c>`);
  });

  it("écrit une chaîne en inlineStr et échappe le XML", () => {
    const xml = ecrireCellule(feuilleVide, "A1", "Ben Ali & <fils>");
    expect(cellule(xml, "A1")).toContain("t=\"inlineStr\"");
    expect(cellule(xml, "A1")).toContain("Ben Ali &amp; &lt;fils&gt;");
  });

  it("insère une cellule manquante dans l'ordre des colonnes", () => {
    const xml = ecrireCellule(feuilleVide, "B1", "x");
    const ordre = [...xml.matchAll(/<c[^>]*r="([A-Z]+1)"/g)].map((m) => m[1]);
    expect(ordre).toEqual(["A1", "B1", "C1"]);
  });

  it("insère une ligne manquante dans l'ordre des lignes", () => {
    const xml = ecrireCellule(feuilleVide, "A2", "x");
    const ordre = [...xml.matchAll(/<row[^>]*r="(\d+)"/g)].map((m) => m[1]);
    expect(ordre).toEqual(["1", "2", "3"]);
  });

  it("vide la cellule sur null sans perdre le style", () => {
    const xml = ecrireCellule(feuilleVide, "C1", null);
    expect(cellule(xml, "C1")).toBe(`<c r="C1" s="4"/>`);
  });

  it("vide la cellule plutôt que d'écrire un nombre non fini", () => {
    // Une division par zéro côté plateforme ne doit pas produire un classeur
    // qu'Excel refuse d'ouvrir.
    expect(cellule(ecrireCellule(feuilleVide, "A1", NaN), "A1")).toBe(`<c r="A1" s="3"/>`);
    expect(cellule(ecrireCellule(feuilleVide, "A1", Infinity), "A1")).toBe(`<c r="A1" s="3"/>`);
  });

  it("ignore une référence invalide", () => {
    expect(ecrireCellule(feuilleVide, "pas une ref", 1)).toBe(feuilleVide);
  });
});

describe("viderCacheFormules", () => {
  it("retire la valeur en cache des cellules de formule", () => {
    const xml = `<row><c r="A1"><f>B1+C1</f><v>42</v></c></row>`;
    expect(viderCacheFormules(xml)).toBe(`<row><c r="A1"><f>B1+C1</f></c></row>`);
  });

  it("laisse les cellules de saisie intactes", () => {
    const xml = `<row><c r="A1"><v>42</v></c></row>`;
    expect(viderCacheFormules(xml)).toBe(xml);
  });

  it("retire le type d'erreur mis en cache", () => {
    // Sans ça, un #DIV/0! hérité du modèle s'affiche avant tout recalcul.
    const xml = `<row><c r="A1" t="e"><f>B1/C1</f><v>#DIV/0!</v></c></row>`;
    expect(viderCacheFormules(xml)).toBe(`<row><c r="A1"><f>B1/C1</f></c></row>`);
  });
});

describe("remplirClasseur sur le modèle du cabinet", () => {
  it("écrit dans la feuille nommée et laisse les autres entrées du zip", () => {
    const avant = unzipSync(lireGabarit());
    const { classeur, feuillesIntrouvables } = remplirClasseur(lireGabarit(), {
      REVENUS: { C3: "Zaatari", C4: "Khalil", D20: 480000 },
    });

    expect(feuillesIntrouvables).toEqual([]);
    const apres = unzipSync(classeur);
    expect(Object.keys(apres).sort()).toEqual(Object.keys(avant).sort());

    const xml = feuille(classeur, "xl/worksheets/sheet1.xml");
    expect(cellule(xml, "C3")).toContain("Zaatari");
    expect(cellule(xml, "D20")).toContain("<v>480000</v>");
  });

  it("conserve fusions et mise en forme conditionnelle du modèle", () => {
    // C'est tout l'intérêt de l'écriture chirurgicale : `exceljs` échoue à
    // réécrire ce classeur à cause d'une règle conditionnelle sans formule.
    const { classeur } = remplirClasseur(lireGabarit(), { REVENUS: { C3: "Test" } });
    const avant = strFromU8(unzipSync(lireGabarit())["xl/worksheets/sheet1.xml"]);
    const apres = feuille(classeur, "xl/worksheets/sheet1.xml");

    const fusions = (x: string) => [...x.matchAll(/<mergeCell ref="([^"]+)"/g)].map((m) => m[1]);
    expect(fusions(apres)).toEqual(fusions(avant));
    expect(apres.match(/<conditionalFormatting/g)?.length).toBe(
      avant.match(/<conditionalFormatting/g)?.length
    );
  });

  it("vide les résultats en cache, y compris des feuilles non écrites", () => {
    // « Tx d'endettement » n'est jamais saisie : elle est entièrement calculée
    // à partir de REVENUS et IMMOBILIER, et son cache est donc périmé.
    const { classeur } = remplirClasseur(lireGabarit(), { REVENUS: { D20: 480000 } });
    const endettement = feuille(classeur, "xl/worksheets/sheet4.xml");
    const avecFormule = [...endettement.matchAll(/<c[^>]*>[\s\S]*?<\/c>/g)].filter((m) =>
      m[0].includes("<f")
    );
    expect(avecFormule.length).toBeGreaterThan(5);
    for (const c of avecFormule) expect(c[0]).not.toContain("<v>");
  });

  it("demande à Excel de tout recalculer à l'ouverture", () => {
    const { classeur } = remplirClasseur(lireGabarit(), { REVENUS: { C3: "Test" } });
    expect(feuille(classeur, "xl/workbook.xml")).toContain('fullCalcOnLoad="1"');
  });

  it("remplace la devise dans les formats de nombre", () => {
    const { classeur } = remplirClasseur(
      lireGabarit(),
      {},
      { formatsNombres: [{ de: "&quot;€&quot;", vers: "&quot;MAD&quot;" }] }
    );
    const styles = feuille(classeur, "xl/styles.xml");
    const numFmts = /<numFmts[\s\S]*?<\/numFmts>/.exec(styles)?.[0] ?? "";
    expect(numFmts).toContain("&quot;MAD&quot;");
    expect(numFmts).not.toContain("&quot;€&quot;");
  });

  const DEVISE = [
    { de: "&quot;€&quot;", vers: "&quot;MAD&quot;" },
    { de: "[$€-40C]", vers: "&quot;MAD&quot;" },
    { de: "_€", vers: "_MAD" },
  ];

  it("élargit automatiquement une colonne touchée par le nouveau format de devise", () => {
    const { classeur } = remplirClasseur(
      lireGabarit(),
      {},
      { formatsNombres: DEVISE, largeurMinimaleAuto: 18 }
    );
    // SIMULATEUR!D : colonne qu'on écrit soi-même (montant, taux, durée).
    const cols = /<cols>[\s\S]*?<\/cols>/.exec(feuille(classeur, "xl/worksheets/sheet6.xml"))?.[0];
    expect(cols).toMatch(/<col[^>]*\bmin="4"[^>]*\bmax="4"[^>]*\bwidth="18"/);
  });

  it("élargit aussi une feuille qu'`ecritures` ne touche jamais", () => {
    // "Formules" ne figure dans aucune des clés que `classeurRempli` écrit -
    // seul son propre calcul interne y porte une cellule au format devise.
    const { classeur } = remplirClasseur(
      lireGabarit(),
      {},
      { formatsNombres: DEVISE, largeurMinimaleAuto: 18 }
    );
    const cols = /<cols>[\s\S]*?<\/cols>/.exec(feuille(classeur, "xl/worksheets/sheet7.xml"))?.[0];
    expect(cols).toMatch(/<col[^>]*\bmin="3"[^>]*\bmax="3"[^>]*\bwidth="18"/);
  });

  it("n'élargit rien si le format de devise n'a pas changé", () => {
    const { classeur } = remplirClasseur(lireGabarit(), {}, { largeurMinimaleAuto: 18 });
    const avant = /<cols>[\s\S]*?<\/cols>/.exec(
      strFromU8(unzipSync(lireGabarit())["xl/worksheets/sheet6.xml"])
    )?.[0];
    const apres = /<cols>[\s\S]*?<\/cols>/.exec(feuille(classeur, "xl/worksheets/sheet6.xml"))?.[0];
    expect(apres).toBe(avant);
  });

  it("ne rétrécit jamais une colonne déjà assez large", () => {
    const { classeur } = remplirClasseur(
      lireGabarit(),
      {},
      { formatsNombres: DEVISE, largeurMinimaleAuto: 18 }
    );
    // FINANCIER!C fait déjà 32 de large.
    const cols = /<cols>[\s\S]*?<\/cols>/.exec(feuille(classeur, "xl/worksheets/sheet3.xml"))?.[0];
    expect(cols).toMatch(/<col[^>]*\bmin="3"[^>]*\bmax="3"[^>]*\bwidth="32\.26953125"/);
  });

  it("signale une feuille inconnue sans échouer", () => {
    const { classeur, feuillesIntrouvables } = remplirClasseur(lireGabarit(), {
      "Feuille absente": { A1: 1 },
    });
    expect(feuillesIntrouvables).toEqual(["Feuille absente"]);
    expect(classeur.byteLength).toBeGreaterThan(0);
  });

  it("trouve une feuille dont le nom contient une apostrophe", () => {
    const { feuillesIntrouvables } = remplirClasseur(lireGabarit(), {
      "Tx d'endettement": { B30: "note" },
    });
    expect(feuillesIntrouvables).toEqual([]);
  });
});
