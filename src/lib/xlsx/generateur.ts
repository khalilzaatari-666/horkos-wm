import { zipSync, strToU8 } from "fflate";

/**
 * Écriture d'un classeur .xlsx de bout en bout.
 *
 * Le module voisin, `classeur.ts`, remplit un gabarit existant sans y toucher
 * autrement - c'était le bon choix tant qu'il fallait préserver la mise en forme
 * du modèle du cabinet. Mais un gabarit a des cases en nombre fini : un seul
 * bien locatif, deux crédits, vingt et une lignes financières. Au-delà, la
 * donnée n'était tout simplement pas exportée.
 *
 * Ici le classeur est construit à partir de la fiche, donc sans limite : chaque
 * tableau fait le nombre de lignes qu'il lui faut. Les formules du modèle ne
 * sont pas reprises - les résultats sont ceux de `calculs.ts`, écrits en clair.
 * Le classeur devient un document qu'on lit, plus un outil qu'on recalcule ;
 * c'est le prix de l'exhaustivité, et le simulateur vit de toute façon sur la
 * plateforme.
 *
 * Le format écrit ici est le sous-ensemble strict d'OOXML qu'Excel, LibreOffice
 * et Numbers acceptent : chaînes en ligne plutôt que table partagée (rien à
 * dédupliquer, et un fichier de moins à tenir cohérent), styles énumérés, pas de
 * relation superflue.
 */

// ---------------------------------------------------------------------------
// Palette et styles
// ---------------------------------------------------------------------------

/** La charte du cabinet, en hexadécimal ARGB comme les attend OOXML. */
const COULEURS = {
  ink: "FF0B1A2E",
  bronze: "FFA9784F",
  bronzeClair: "FFEADBCB",
  cream: "FFF8F4EC",
  creamDeep: "FFEFE7D8",
  charcoal: "FF3B3A36",
  warmGrey: "FF7A7468",
  blanc: "FFFFFFFF",
  vert: "FF047857",
  rouge: "FFB91C1C",
};

/**
 * Deux polices seulement, et toutes deux présentes d'origine sur Windows comme
 * sur macOS. Cormorant Garamond et Inter ne le sont pas : les demander ici
 * donnerait un classeur qui s'affiche correctement chez nous et en Calibri chez
 * le client, ce qui est pire qu'un choix assumé. Georgia tient le rôle du
 * serif de titre, Calibri celui du texte courant.
 */
const SERIF = "Georgia";
const SANS = "Calibri";

/** Les styles utilisables dans une cellule. L'ordre fixe leur index dans styles.xml. */
export type Style =
  | "titre"
  | "sousTitre"
  | "section"
  | "enTete"
  | "texte"
  | "texteGris"
  | "libelle"
  | "montant"
  | "montantFort"
  | "nombre"
  | "pourcent"
  | "date"
  | "total"
  | "totalMontant"
  | "kpiLibelle"
  | "kpiValeur"
  | "conforme"
  | "nonConforme"
  | "note";

const STYLES: Style[] = [
  "titre",
  "sousTitre",
  "section",
  "enTete",
  "texte",
  "texteGris",
  "libelle",
  "montant",
  "montantFort",
  "nombre",
  "pourcent",
  "date",
  "total",
  "totalMontant",
  "kpiLibelle",
  "kpiValeur",
  "conforme",
  "nonConforme",
  "note",
];

/** Index du style dans `cellXfs`. Zéro reste le style par défaut d'Excel. */
function indexStyle(style: Style | undefined): number {
  if (!style) return 0;
  return STYLES.indexOf(style) + 1;
}

// ---------------------------------------------------------------------------
// Modèle d'un classeur
// ---------------------------------------------------------------------------

export interface Cellule {
  /** `null` laisse la cellule vide sans perdre son style de fond. */
  v: string | number | null;
  style?: Style;
  /** Nombre de colonnes fusionnées vers la droite, cellule comprise. */
  fusion?: number;
}

export interface Ligne {
  cellules: (Cellule | string | number | null)[];
  /** Hauteur en points. Sert à aérer les titres et les bandeaux. */
  hauteur?: number;
}

export interface Feuille {
  nom: string;
  /** Largeur de chaque colonne, en caractères. */
  colonnes: number[];
  lignes: Ligne[];
  /** Nombre de lignes figées en haut (l'en-tête reste visible au défilement). */
  figer?: number;
}

// ---------------------------------------------------------------------------
// Sérialisation
// ---------------------------------------------------------------------------

const ECHAPPEMENTS: [RegExp, string][] = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
  [/"/g, "&quot;"],
];

function echapper(texte: string): string {
  return ECHAPPEMENTS.reduce((acc, [motif, vers]) => acc.replace(motif, vers), texte);
}

/** 1 → « A », 27 → « AA ». */
export function lettreColonne(index: number): string {
  let n = index;
  let lettres = "";
  while (n > 0) {
    const reste = (n - 1) % 26;
    lettres = String.fromCharCode(65 + reste) + lettres;
    n = Math.floor((n - reste) / 26);
  }
  return lettres;
}

/**
 * Excel refuse un nom de feuille de plus de 31 caractères, ou portant l'un des
 * caractères réservés. Un nom invalide n'ouvre pas une boîte de dialogue : il
 * rend le fichier illisible, sans rien dire.
 */
function nomFeuilleValide(nom: string, index: number): string {
  const propre = nom.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31);
  return propre || `Feuille ${index + 1}`;
}

function normaliser(c: Cellule | string | number | null): Cellule {
  if (c === null || typeof c === "string" || typeof c === "number") return { v: c };
  return c;
}

function xmlCellule(ref: string, cellule: Cellule): string {
  const s = indexStyle(cellule.style);
  const attrs = `r="${ref}"${s ? ` s="${s}"` : ""}`;

  if (cellule.v === null || cellule.v === "") return `<c ${attrs}/>`;
  if (typeof cellule.v === "number") {
    // `Infinity` et `NaN` produiraient un fichier qu'Excel refuse d'ouvrir.
    const nombre = Number.isFinite(cellule.v) ? cellule.v : 0;
    return `<c ${attrs}><v>${nombre}</v></c>`;
  }
  // Chaîne en ligne : pas de table partagée à tenir à jour. `xml:space` garde
  // les espaces d'alignement, qu'Excel rognerait sans lui.
  return `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${echapper(
    cellule.v
  )}</t></is></c>`;
}

function xmlFeuille(feuille: Feuille): string {
  const colonnes = feuille.colonnes
    .map((largeur, i) => `<col min="${i + 1}" max="${i + 1}" width="${largeur}" customWidth="1"/>`)
    .join("");

  const fusions: string[] = [];
  const lignes = feuille.lignes
    .map((ligne, index) => {
      const r = index + 1;
      let colonne = 1;
      const cellules: string[] = [];

      for (const brute of ligne.cellules) {
        const cellule = normaliser(brute);
        const debut = `${lettreColonne(colonne)}${r}`;
        cellules.push(xmlCellule(debut, cellule));

        const largeur = Math.max(1, cellule.fusion ?? 1);
        if (largeur > 1) {
          // Les cellules couvertes existent quand même, sans contenu : sans
          // elles, la bordure et le fond du bandeau s'arrêtent à la première.
          for (let k = 1; k < largeur; k++) {
            cellules.push(
              xmlCellule(`${lettreColonne(colonne + k)}${r}`, { v: null, style: cellule.style })
            );
          }
          fusions.push(`${debut}:${lettreColonne(colonne + largeur - 1)}${r}`);
        }
        colonne += largeur;
      }

      const hauteur = ligne.hauteur ? ` ht="${ligne.hauteur}" customHeight="1"` : "";
      return `<row r="${r}"${hauteur}>${cellules.join("")}</row>`;
    })
    .join("");

  const volet = feuille.figer
    ? `<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${feuille.figer}" topLeftCell="A${
        feuille.figer + 1
      }" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>`;

  const zonesFusionnees = fusions.length
    ? `<mergeCells count="${fusions.length}">${fusions
        .map((f) => `<mergeCell ref="${f}"/>`)
        .join("")}</mergeCells>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${volet}<cols>${colonnes}</cols><sheetData>${lignes}</sheetData>${zonesFusionnees}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/></worksheet>`;
}

/**
 * Le catalogue de styles.
 *
 * Écrit à la main et dans l'ordre : chaque `xf` de `cellXfs` désigne une police,
 * un remplissage, une bordure et un format de nombre par leur index. Un décalage
 * ici et tout le classeur change d'apparence sans erreur visible - d'où les
 * tableaux nommés plutôt que des index en dur.
 */
function xmlStyles(): string {
  // Index 0 et 1 des remplissages sont imposés par le format (none, gray125).
  const remplissages = [
    null,
    null,
    COULEURS.ink,
    COULEURS.bronze,
    COULEURS.cream,
    COULEURS.creamDeep,
    COULEURS.bronzeClair,
  ];

  const polices: { taille: number; couleur: string; gras?: boolean; nom: string; italique?: boolean }[] = [
    { taille: 11, couleur: COULEURS.charcoal, nom: SANS },
    { taille: 22, couleur: COULEURS.blanc, nom: SERIF },
    { taille: 11, couleur: COULEURS.cream, nom: SANS },
    { taille: 13, couleur: COULEURS.ink, gras: true, nom: SERIF },
    { taille: 9, couleur: COULEURS.warmGrey, gras: true, nom: SANS },
    { taille: 11, couleur: COULEURS.ink, nom: SANS },
    { taille: 11, couleur: COULEURS.warmGrey, nom: SANS },
    { taille: 11, couleur: COULEURS.ink, gras: true, nom: SANS },
    { taille: 12, couleur: COULEURS.ink, gras: true, nom: SANS },
    { taille: 16, couleur: COULEURS.ink, gras: true, nom: SERIF },
    { taille: 11, couleur: COULEURS.vert, gras: true, nom: SANS },
    { taille: 11, couleur: COULEURS.rouge, gras: true, nom: SANS },
    { taille: 10, couleur: COULEURS.warmGrey, italique: true, nom: SANS },
  ];
  const P = {
    base: 0,
    titre: 1,
    sousTitre: 2,
    section: 3,
    enTete: 4,
    ink: 5,
    gris: 6,
    inkGras: 7,
    inkGrasMoyen: 8,
    kpi: 9,
    vert: 10,
    rouge: 11,
    note: 12,
  };

  /** 164 est le premier index libre pour un format personnalisé. */
  const formats = [
    { id: 164, code: '#,##0\\ &quot;MAD&quot;' },
    { id: 165, code: "0.0%" },
    { id: 166, code: "#,##0" },
    { id: 167, code: "dd/mm/yyyy" },
  ];
  const F = { montant: 164, pourcent: 165, nombre: 166, date: 167 };

  // Une seule bordure utile : un filet clair sous les cellules de tableau.
  const bordures = [
    "<border><left/><right/><top/><bottom/><diagonal/></border>",
    `<border><left/><right/><top/><bottom style="thin"><color rgb="${COULEURS.creamDeep}"/></bottom><diagonal/></border>`,
    `<border><left/><right/><top style="thin"><color rgb="${COULEURS.bronze}"/></top><bottom/><diagonal/></border>`,
  ];
  const B = { aucune: 0, sous: 1, dessus: 2 };

  const R = { aucun: 0, ink: 2, bronze: 3, cream: 4, creamDeep: 5, bronzeClair: 6 };

  /** Un style = police, remplissage, bordure, format, alignement. */
  const xf = (
    police: number,
    remplissage: number,
    bordure: number,
    format: number,
    alignement?: string
  ) =>
    `<xf numFmtId="${format}" fontId="${police}" fillId="${remplissage}" borderId="${bordure}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"${
      alignement ? ` applyAlignment="1"><alignment ${alignement}/></xf>` : "/>"
    }`;

  const gauche = 'vertical="center" wrapText="1"';
  const droite = 'horizontal="right" vertical="center"';
  const centre = 'horizontal="center" vertical="center"';

  const catalogue: Record<Style, string> = {
    titre: xf(P.titre, R.ink, B.aucune, 0, 'vertical="center" indent="1"'),
    sousTitre: xf(P.sousTitre, R.ink, B.aucune, 0, 'vertical="center" indent="1"'),
    section: xf(P.section, R.bronzeClair, B.aucune, 0, 'vertical="center" indent="1"'),
    enTete: xf(P.enTete, R.creamDeep, B.aucune, 0, centre),
    texte: xf(P.ink, R.aucun, B.sous, 0, gauche),
    texteGris: xf(P.gris, R.aucun, B.sous, 0, gauche),
    libelle: xf(P.gris, R.aucun, B.sous, 0, gauche),
    montant: xf(P.ink, R.aucun, B.sous, F.montant, droite),
    montantFort: xf(P.inkGras, R.aucun, B.sous, F.montant, droite),
    nombre: xf(P.ink, R.aucun, B.sous, F.nombre, droite),
    pourcent: xf(P.ink, R.aucun, B.sous, F.pourcent, droite),
    date: xf(P.ink, R.aucun, B.sous, 0, gauche),
    total: xf(P.inkGrasMoyen, R.cream, B.dessus, 0, gauche),
    totalMontant: xf(P.inkGrasMoyen, R.cream, B.dessus, F.montant, droite),
    kpiLibelle: xf(P.enTete, R.cream, B.aucune, 0, 'vertical="center" indent="1"'),
    kpiValeur: xf(P.kpi, R.cream, B.aucune, F.montant, 'vertical="center" indent="1"'),
    conforme: xf(P.vert, R.aucun, B.sous, 0, gauche),
    nonConforme: xf(P.rouge, R.aucun, B.sous, 0, gauche),
    note: xf(P.note, R.aucun, B.aucune, 0, gauche),
  };

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="${formats.length}">${formats
    .map((f) => `<numFmt numFmtId="${f.id}" formatCode="${f.code}"/>`)
    .join("")}</numFmts>
<fonts count="${polices.length}">${polices
    .map(
      (p) =>
        `<font><sz val="${p.taille}"/><color rgb="${p.couleur}"/><name val="${p.nom}"/>${
          p.gras ? "<b/>" : ""
        }${p.italique ? "<i/>" : ""}</font>`
    )
    .join("")}</fonts>
<fills count="${remplissages.length}">${remplissages
    .map((c, i) =>
      i === 0
        ? '<fill><patternFill patternType="none"/></fill>'
        : i === 1
          ? '<fill><patternFill patternType="gray125"/></fill>'
          : `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/><bgColor indexed="64"/></patternFill></fill>`
    )
    .join("")}</fills>
<borders count="${bordures.length}">${bordures.join("")}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${STYLES.length + 1}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>${STYLES.map(
    (s) => catalogue[s]
  ).join("")}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

/** Assemble le .xlsx. Les feuilles vides sont écartées plutôt qu'exportées nues. */
export function creerClasseur(feuilles: Feuille[]): Uint8Array {
  const retenues = feuilles.filter((f) => f.lignes.length > 0);
  const nommees = retenues.map((f, i) => ({ ...f, nom: nomFeuilleValide(f.nom, i) }));

  const fichiers: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${nommees
  .map(
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )
  .join("")}
</Types>`
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nommees
        .map(
          (f, i) => `<sheet name="${echapper(f.nom)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
        )
        .join("")}</sheets></workbook>`
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${nommees
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${
              i + 1
            }.xml"/>`
        )
        .join("")}<Relationship Id="rId${
        nommees.length + 1
      }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
    ),
    "xl/styles.xml": strToU8(xmlStyles()),
  };

  for (const [i, feuille] of nommees.entries()) {
    fichiers[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xmlFeuille(feuille));
  }

  return zipSync(fichiers, { level: 6 });
}
