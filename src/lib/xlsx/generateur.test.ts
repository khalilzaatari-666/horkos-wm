import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { creerClasseur, lettreColonne } from "./generateur";

/**
 * Un .xlsx invalide ne se signale pas : Excel annonce « fichier illisible » et
 * n'en dit pas plus. Ces tests vérifient donc la structure du paquet - les
 * parties obligatoires, les relations, la cohérence des index - plutôt que
 * l'apparence, qui elle se juge à l'œil.
 */
function ouvrir(octets: Uint8Array): Record<string, string> {
  const zip = unzipSync(octets);
  return Object.fromEntries(Object.entries(zip).map(([nom, u8]) => [nom, strFromU8(u8)]));
}

const feuilleSimple = {
  nom: "Test",
  colonnes: [20, 30],
  lignes: [{ cellules: [{ v: "Libellé", style: "libelle" as const }, { v: 1200, style: "montant" as const }] }],
};

describe("lettreColonne", () => {
  it("numérote les colonnes comme Excel", () => {
    expect(lettreColonne(1)).toBe("A");
    expect(lettreColonne(26)).toBe("Z");
    expect(lettreColonne(27)).toBe("AA");
    expect(lettreColonne(52)).toBe("AZ");
    expect(lettreColonne(53)).toBe("BA");
  });
});

describe("creerClasseur", () => {
  it("écrit toutes les parties qu'un .xlsx doit contenir", () => {
    const fichiers = ouvrir(creerClasseur([feuilleSimple]));
    expect(Object.keys(fichiers).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
  });

  it("déclare une relation et un type de contenu par feuille", () => {
    const fichiers = ouvrir(
      creerClasseur([feuilleSimple, { ...feuilleSimple, nom: "Deux" }, { ...feuilleSimple, nom: "Trois" }])
    );
    const rels = fichiers["xl/_rels/workbook.xml.rels"];
    for (const i of [1, 2, 3]) {
      expect(rels).toContain(`Target="worksheets/sheet${i}.xml"`);
      expect(fichiers["[Content_Types].xml"]).toContain(`/xl/worksheets/sheet${i}.xml`);
    }
    // La dernière relation est celle des styles : sans elle, tout le classeur
    // s'ouvre en noir et blanc.
    expect(rels).toContain('Id="rId4"');
    expect(rels).toContain('Target="styles.xml"');
  });

  it("place les cellules aux bonnes références et distingue nombres et texte", () => {
    const xml = ouvrir(creerClasseur([feuilleSimple]))["xl/worksheets/sheet1.xml"];
    expect(xml).toContain('<c r="A1"');
    expect(xml).toContain("<t xml:space=\"preserve\">Libellé</t>");
    expect(xml).toContain('<c r="B1" s="8"><v>1200</v></c>');
  });

  it("échappe ce qui casserait le XML", () => {
    const xml = ouvrir(
      creerClasseur([{ ...feuilleSimple, lignes: [{ cellules: ['Dupont & <Fils> "SARL"'] }] }])
    )["xl/worksheets/sheet1.xml"];
    expect(xml).toContain("Dupont &amp; &lt;Fils&gt; &quot;SARL&quot;");
  });

  it("fusionne une cellule et matérialise les colonnes couvertes", () => {
    const xml = ouvrir(
      creerClasseur([
        { ...feuilleSimple, lignes: [{ cellules: [{ v: "Bandeau", style: "titre", fusion: 3 }] }] },
      ])
    )["xl/worksheets/sheet1.xml"];
    expect(xml).toContain('<mergeCell ref="A1:C1"/>');
    // Les cellules couvertes doivent exister, sinon le fond du bandeau s'arrête
    // à la première colonne.
    expect(xml).toContain('<c r="B1" s="1"/>');
    expect(xml).toContain('<c r="C1" s="1"/>');
  });

  it("fige les lignes d'en-tête quand on le demande", () => {
    const xml = ouvrir(creerClasseur([{ ...feuilleSimple, figer: 2 }]))["xl/worksheets/sheet1.xml"];
    expect(xml).toContain('ySplit="2"');
    expect(xml).toContain('state="frozen"');
  });

  it("rend sûr un nom de feuille qu'Excel refuserait", () => {
    const xml = ouvrir(
      creerClasseur([
        { ...feuilleSimple, nom: "Immobilier / Crédits [2026] : très long nom de feuille" },
      ])
    )["xl/workbook.xml"];
    const nom = /name="([^"]+)"/.exec(xml)?.[1] ?? "";
    expect(nom.length).toBeLessThanOrEqual(31);
    expect(nom).not.toMatch(/[\\/?*[\]:]/);
  });

  it("écarte les feuilles vides plutôt que de les exporter nues", () => {
    const fichiers = ouvrir(
      creerClasseur([feuilleSimple, { nom: "Vide", colonnes: [10], lignes: [] }])
    );
    expect(fichiers["xl/worksheets/sheet2.xml"]).toBeUndefined();
    expect(fichiers["xl/workbook.xml"]).not.toContain("Vide");
  });

  it("remplace un nombre non fini plutôt que de produire un fichier illisible", () => {
    const xml = ouvrir(
      creerClasseur([{ ...feuilleSimple, lignes: [{ cellules: [{ v: Infinity }, { v: NaN }] }] }])
    )["xl/worksheets/sheet1.xml"];
    expect(xml).not.toContain("Infinity");
    expect(xml).not.toContain("NaN");
  });

  it("déclare autant de styles que le catalogue en compte", () => {
    const styles = ouvrir(creerClasseur([feuilleSimple]))["xl/styles.xml"];
    const declares = Number(/<cellXfs count="(\d+)"/.exec(styles)?.[1]);
    const ecrits = (styles.match(/<xf [^>]*xfId="0"/g) ?? []).length;
    expect(ecrits).toBe(declares);
  });
});
