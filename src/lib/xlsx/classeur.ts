import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";

/**
 * Écriture chirurgicale dans un classeur .xlsx existant.
 *
 * Le cabinet remplit un modèle Excel dont la mise en forme - fusions, couleurs,
 * mises en forme conditionnelles, largeurs de colonnes - fait partie du
 * document. Le relire puis le réécrire avec une bibliothèque de haut niveau le
 * dégrade : `exceljs` refuse même d'écrire celui-ci (une règle de mise en forme
 * conditionnelle sans formule le fait planter). On procède donc autrement : le
 * fichier est un zip d'XML, on ne remplace que les cellules demandées et tout
 * le reste ressort octet pour octet identique.
 *
 * Ce module ne sait volontairement pas lire un classeur : il ne fait qu'écrire
 * dans un gabarit dont on connaît les cellules.
 */

/** Valeur écrivable dans une cellule. `null` vide la cellule. */
export type Valeur = string | number | boolean | null;

/** Cellules à écrire, par nom de feuille puis référence (`"B5"`). */
export type Ecritures = Record<string, Record<string, Valeur>>;

export interface Options {
  /**
   * Remplacements appliqués aux codes de format de `styles.xml`. Sert à passer
   * la devise du modèle (€) à celle du cabinet, la devise étant portée par le
   * format de nombre et non par les cellules.
   */
  formatsNombres?: { de: string; vers: string }[];
  /**
   * Largeur minimale imposée à toute colonne, sur n'importe quelle feuille,
   * dont au moins une cellule utilise un format touché par `formatsNombres`.
   * Une colonne déjà plus large n'est jamais rétrécie.
   *
   * « MAD » compte trois caractères de plus que « € », et ces formats
   * apparaissent sur des dizaines de colonnes dispersées dans tout le
   * classeur - y compris des feuilles où l'on n'écrit jamais rien (leurs
   * propres formules y calculent des montants). Les repérer une par une a vite
   * manqué des cas ; ceci les détecte toutes, sans liste à tenir à jour.
   */
  largeurMinimaleAuto?: number;
}

const ECHAPPEMENTS: [RegExp, string][] = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
  [/"/g, "&quot;"],
];

function echapper(texte: string): string {
  return ECHAPPEMENTS.reduce((acc, [motif, vers]) => acc.replace(motif, vers), texte);
}

/** `"AB12"` -> `{ colonne: 28, ligne: 12 }`. La colonne est 1-indexée. */
export function decouperReference(ref: string): { colonne: number; ligne: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return null;
  let colonne = 0;
  for (const c of m[1]) colonne = colonne * 26 + (c.charCodeAt(0) - 64);
  return { colonne, ligne: Number(m[2]) };
}

/**
 * Élargit une colonne (numéro 1-indexé) si elle est plus étroite que
 * `minimum`, sans jamais la rétrécir.
 *
 * Une colonne n'a pas toujours sa propre balise : ces gabarits partagent
 * parfois une plage (`min="5" max="6"`) entre deux colonnes de même largeur.
 * On élargit alors toute la plage plutôt que de la scinder - au pire une
 * colonne voisine gagne un peu de place inutile, jamais un défaut.
 */
function elargirColonneNumero(xml: string, colonne: number, minimum: number): string {
  return xml.replace(/<col\b[^>]*\/>/g, (tag) => {
    const min = Number(/\bmin="(\d+)"/.exec(tag)?.[1] ?? NaN);
    const max = Number(/\bmax="(\d+)"/.exec(tag)?.[1] ?? NaN);
    if (!(min <= colonne && colonne <= max)) return tag;

    const actuelle = Number(/\bwidth="([\d.]+)"/.exec(tag)?.[1] ?? 0);
    if (actuelle >= minimum) return tag;
    const propre = tag
      .replace(/\s*\bwidth="[\d.]+"/, "")
      .replace(/\s*\bcustomWidth="[^"]*"/, "")
      .replace(/\/>$/, "");
    return `${propre} width="${minimum}" customWidth="1"/>`;
  });
}

/**
 * Les index de `<cellXfs>` (position = style `s="N"` d'une cellule) dont le
 * format de nombre fait partie de `numFmtIds`.
 */
function stylesAvecFormats(stylesXml: string, numFmtIds: Set<string>): Set<number> {
  const bloc = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml);
  const resultat = new Set<number>();
  if (!bloc) return resultat;

  let index = 0;
  for (const m of bloc[1].matchAll(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)) {
    const id = /\bnumFmtId="(\d+)"/.exec(m[0])?.[1];
    if (id && numFmtIds.has(id)) resultat.add(index);
    index++;
  }
  return resultat;
}

/** Les colonnes d'une feuille où au moins une cellule porte un des styles donnés. */
function colonnesAvecStyles(sheetXml: string, styles: Set<number>): Set<number> {
  const resultat = new Set<number>();
  for (const m of sheetXml.matchAll(/<c\b([^>]*?)(?:\/>|>)/g)) {
    const attrs = m[1];
    const s = /\bs="(\d+)"/.exec(attrs)?.[1];
    if (!s || !styles.has(Number(s))) continue;
    const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
    const position = ref ? decouperReference(ref) : null;
    if (position) resultat.add(position.colonne);
  }
  return resultat;
}

/**
 * Rend le XML d'une cellule.
 *
 * Les chaînes sont écrites en `inlineStr` plutôt qu'ajoutées à la table des
 * chaînes partagées : le gabarit garde ainsi sa table intacte, et Excel lit les
 * deux formes indifféremment.
 *
 * `attributs` reprend ceux de la cellule remplacée, `s` compris - c'est lui qui
 * porte le style, donc la police, le fond jaune des cases à saisir et le format
 * monétaire. Le perdre reviendrait à écrire la bonne valeur dans une cellule
 * devenue blanche.
 */
function rendreCellule(ref: string, valeur: Valeur, attributs: string): string {
  // `t` et les attributs de formule sont refaits ici, le reste est conservé.
  const base = attributs
    // Une cellule auto-fermée livre ses attributs avec le `/` final collé.
    .replace(/\/\s*$/, "")
    .replace(/\s*\br="[^"]*"/g, "")
    .replace(/\s*\bt="[^"]*"/g, "")
    .replace(/\s*\bcm="[^"]*"/g, "")
    .trim();
  const garde = base ? ` ${base}` : "";

  if (valeur === null || valeur === "") return `<c r="${ref}"${garde}/>`;

  if (typeof valeur === "number") {
    // NaN et Infinity n'ont pas de représentation dans le format : plutôt vider
    // la cellule que d'y écrire un littéral qu'Excel refusera.
    if (!Number.isFinite(valeur)) return `<c r="${ref}"${garde}/>`;
    return `<c r="${ref}"${garde}><v>${valeur}</v></c>`;
  }

  if (typeof valeur === "boolean") {
    return `<c r="${ref}"${garde} t="b"><v>${valeur ? 1 : 0}</v></c>`;
  }

  return `<c r="${ref}"${garde} t="inlineStr"><is><t xml:space="preserve">${echapper(
    valeur
  )}</t></is></c>`;
}

/**
 * Motifs d'éléments XML.
 *
 * Les quantificateurs sont paresseux à dessein : avec `[^>]*` gourmand, la
 * balise auto-fermée `<c r="A1"/>` laisse le moteur avaler le `/`, l'alternative
 * `>…</c>` prend alors le relais et le « premier élément » s'étend jusqu'à la
 * fin de la ligne. Les cellules s'insèrent au mauvais endroit sans rien
 * signaler.
 */
const ELEMENT_LIGNE = /<row[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g;
const ELEMENT_CELLULE = /<c[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g;

/** Insère `enfant` dans `parent` à la position donnée par `cle`, ordre croissant. */
function insererDansOrdre(
  contenu: string,
  motifElements: RegExp,
  cleDe: (element: string) => number,
  cleNouveau: number,
  nouveau: string
): string {
  for (const m of contenu.matchAll(motifElements)) {
    if (cleDe(m[0]) > cleNouveau) {
      return contenu.slice(0, m.index) + nouveau + contenu.slice(m.index);
    }
  }
  return contenu + nouveau;
}

/** Écrit une cellule dans le XML d'une feuille, en créant ligne et cellule au besoin. */
export function ecrireCellule(xml: string, ref: string, valeur: Valeur): string {
  const position = decouperReference(ref);
  if (!position) return xml;

  const motifLigne = new RegExp(
    `<row[^>]*?\\br="${position.ligne}"[^>]*?(?:/>|>[\\s\\S]*?</row>)`
  );
  const ligne = motifLigne.exec(xml);

  if (!ligne) {
    // Ligne absente : on la crée à sa place dans la feuille. `<sheetData/>`
    // auto-fermé est possible sur une feuille vide.
    const nouvelle = `<row r="${position.ligne}">${rendreCellule(ref, valeur, "")}</row>`;
    const vide = /<sheetData\s*\/>/.exec(xml);
    if (vide) {
      return xml.replace(vide[0], `<sheetData>${nouvelle}</sheetData>`);
    }
    const corps = /<sheetData[^>]*>([\s\S]*?)<\/sheetData>/.exec(xml);
    if (!corps) return xml;
    const remplace = insererDansOrdre(
      corps[1],
      ELEMENT_LIGNE,
      (el) => Number(/\br="(\d+)"/.exec(el)?.[1] ?? 0),
      position.ligne,
      nouvelle
    );
    return xml.replace(corps[0], corps[0].replace(corps[1], remplace));
  }

  // Une ligne auto-fermée n'a pas de cellules : on lui en donne un corps.
  const ligneXml = ligne[0].endsWith("/>")
    ? `${ligne[0].slice(0, -2)}></row>`
    : ligne[0];

  const motifCellule = new RegExp(
    `<c([^>]*?\\br="${ref}"[^>]*?)(?:/>|>([\\s\\S]*?)</c>)`
  );
  const cellule = motifCellule.exec(ligneXml);

  if (cellule) {
    return xml.replace(ligne[0], ligneXml.replace(cellule[0], rendreCellule(ref, valeur, cellule[1])));
  }

  // Cellule absente de la ligne : insérée dans l'ordre des colonnes, sans quoi
  // Excel signale un fichier illisible.
  const corps = /<row[^>]*>([\s\S]*)<\/row>/.exec(ligneXml);
  if (!corps) return xml;
  const remplace = insererDansOrdre(
    corps[1],
    ELEMENT_CELLULE,
    (el) => decouperReference(/\br="([A-Z]+\d+)"/.exec(el)?.[1] ?? "A1")?.colonne ?? 0,
    position.colonne,
    rendreCellule(ref, valeur, "")
  );
  return xml.replace(ligne[0], ligneXml.replace(corps[1], remplace));
}

/**
 * Retire la valeur mise en cache des cellules de formule.
 *
 * Excel enregistre le dernier résultat calculé à côté de la formule. Sans ce
 * nettoyage, un classeur rempli s'ouvrirait en affichant les résultats de
 * l'ancien remplissage jusqu'à ce que quelqu'un force un recalcul - un taux
 * d'endettement faux, présenté comme un fait.
 */
export function viderCacheFormules(xml: string): string {
  return xml.replace(
    /<c([^>]*)>([\s\S]*?)<\/c>/g,
    (entier, attributs: string, corps: string) => {
      if (!corps.includes("<f")) return entier;
      const sansValeur = corps.replace(/<v>[\s\S]*?<\/v>/g, "");
      // `t="e"` (erreur) et `t="str"` décrivent la valeur en cache, pas la
      // formule : les garder ferait afficher #DIV/0! avant tout recalcul.
      const propres = attributs.replace(/\s*\bt="(e|str)"/g, "");
      return `<c${propres}>${sansValeur}</c>`;
    }
  );
}

/** Force Excel à tout recalculer à l'ouverture. */
function forcerRecalcul(xml: string): string {
  if (/<calcPr\b/.test(xml)) {
    return xml.replace(/<calcPr\b([^>]*)\/>/, (entier, attrs: string) =>
      /fullCalcOnLoad/.test(attrs)
        ? entier
        : `<calcPr${attrs} fullCalcOnLoad="1"/>`
    );
  }
  return xml.replace("</workbook>", '<calcPr calcId="0" fullCalcOnLoad="1"/></workbook>');
}

/** Chemin interne de chaque feuille, par nom affiché dans Excel. */
function localiserFeuilles(fichiers: Record<string, Uint8Array>): Map<string, string> {
  const workbook = strFromU8(fichiers["xl/workbook.xml"] ?? new Uint8Array());
  const rels = strFromU8(fichiers["xl/_rels/workbook.xml.rels"] ?? new Uint8Array());

  const cibles = new Map<string, string>();
  for (const tag of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(tag[0])?.[1];
    const cible = /Target="([^"]+)"/.exec(tag[0])?.[1];
    if (id && cible) cibles.set(id, `xl/${cible.replace(/^\/?xl\//, "")}`);
  }

  const feuilles = new Map<string, string>();
  for (const tag of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const nom = /name="([^"]*)"/.exec(tag[0])?.[1];
    const id = /r:id="([^"]*)"/.exec(tag[0])?.[1];
    const chemin = id ? cibles.get(id) : undefined;
    if (nom && chemin) {
      // Les noms de feuille traversent l'XML échappés (« Tx d'endettement »).
      feuilles.set(
        nom.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
        chemin
      );
    }
  }
  return feuilles;
}

/**
 * Remplit un gabarit et rend le classeur résultant.
 *
 * Une feuille ou une cellule inconnue est ignorée sans bruit : le gabarit peut
 * évoluer sans faire échouer un export, et un champ qui n'atterrit nulle part
 * se voit au relevé (`feuillesIntrouvables`).
 */
export function remplirClasseur(
  gabarit: Uint8Array,
  ecritures: Ecritures,
  options: Options = {}
): { classeur: Uint8Array; feuillesIntrouvables: string[] } {
  const fichiers = unzipSync(gabarit);
  const feuilles = localiserFeuilles(fichiers);
  const introuvables: string[] = [];

  for (const [nomFeuille, cellules] of Object.entries(ecritures)) {
    const chemin = feuilles.get(nomFeuille);
    if (!chemin || !fichiers[chemin]) {
      introuvables.push(nomFeuille);
      continue;
    }
    let xml = strFromU8(fichiers[chemin]);
    for (const [ref, valeur] of Object.entries(cellules)) {
      xml = ecrireCellule(xml, ref, valeur);
    }
    xml = viderCacheFormules(xml);
    fichiers[chemin] = strToU8(xml);
  }

  // Les feuilles non touchées gardent elles aussi des résultats en cache
  // calculés à partir des cellules qu'on vient de changer.
  for (const chemin of feuilles.values()) {
    if (!fichiers[chemin]) continue;
    const dejaTraitee = Object.keys(ecritures).some((nom) => feuilles.get(nom) === chemin);
    if (dejaTraitee) continue;
    fichiers[chemin] = strToU8(viderCacheFormules(strFromU8(fichiers[chemin])));
  }

  if (fichiers["xl/workbook.xml"]) {
    fichiers["xl/workbook.xml"] = strToU8(forcerRecalcul(strFromU8(fichiers["xl/workbook.xml"])));
  }

  const formats = options.formatsNombres ?? [];
  if (formats.length && fichiers["xl/styles.xml"]) {
    let styles = strFromU8(fichiers["xl/styles.xml"]);
    // Les `numFmtId` réellement changés : seuls ceux-là comptent pour élargir
    // des colonnes, pas tous les formats de nombre du classeur.
    const idsModifies = new Set<string>();
    styles = styles.replace(/<numFmt\b[^>]*\/>/g, (tag) => {
      const remplace = formats.reduce((acc, { de, vers }) => acc.split(de).join(vers), tag);
      if (remplace !== tag) {
        const id = /\bnumFmtId="(\d+)"/.exec(tag)?.[1];
        if (id) idsModifies.add(id);
      }
      return remplace;
    });
    fichiers["xl/styles.xml"] = strToU8(styles);

    const largeurAuto = options.largeurMinimaleAuto;
    if (largeurAuto && idsModifies.size) {
      const stylesTouches = stylesAvecFormats(styles, idsModifies);
      if (stylesTouches.size) {
        // Sur TOUTES les feuilles, pas seulement celles qu'on vient d'écrire :
        // une feuille jamais touchée par `ecritures` peut très bien calculer
        // elle-même un montant avec l'un de ces formats.
        for (const chemin of feuilles.values()) {
          if (!fichiers[chemin]) continue;
          let xml = strFromU8(fichiers[chemin]);
          for (const colonne of colonnesAvecStyles(xml, stylesTouches)) {
            xml = elargirColonneNumero(xml, colonne, largeurAuto);
          }
          fichiers[chemin] = strToU8(xml);
        }
      }
    }
  }

  return { classeur: zipSync(fichiers), feuillesIntrouvables: introuvables };
}
