import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * Un petit moteur de mise en page pour les documents PDF du cabinet.
 *
 * pdf-lib ne connaît que des primitives : dessine un rectangle, écris un texte
 * à telle coordonnée. Tout ce qui fait un document - un curseur qui descend, un
 * saut de page automatique, un tableau dont les colonnes s'alignent, un texte
 * qui revient à la ligne - se construit par-dessus. C'est ce que fait cette
 * classe, et rien d'autre : elle ignore ce qu'est un audit patrimonial.
 *
 * Les polices du cabinet sont embarquées (Cormorant Garamond pour les titres,
 * Inter pour le texte) plutôt que réclamées au lecteur : un PDF qui s'affiche
 * en Times chez le client n'a plus grand-chose de la charte. Elles sont lues
 * sur le disque au premier document, comme le modèle de classeur.
 */

const A4 = { largeur: 595.28, hauteur: 841.89 };
const MARGE = 48;
const LARGEUR_UTILE = A4.largeur - MARGE * 2;

export const COULEURS = {
  ink: rgb(0.043, 0.102, 0.18),
  bronze: rgb(0.663, 0.471, 0.31),
  bronzeClair: rgb(0.918, 0.859, 0.796),
  cream: rgb(0.973, 0.957, 0.925),
  creamDeep: rgb(0.937, 0.906, 0.847),
  charcoal: rgb(0.231, 0.227, 0.212),
  warmGrey: rgb(0.478, 0.455, 0.408),
  blanc: rgb(1, 1, 1),
  vert: rgb(0.016, 0.47, 0.341),
  rouge: rgb(0.725, 0.11, 0.11),
};

interface Polices {
  titre: PDFFont;
  titreGras: PDFFont;
  texte: PDFFont;
  texteGras: PDFFont;
}

const FICHIERS = {
  titre: "CormorantGaramond-Regular.ttf",
  titreGras: "CormorantGaramond-SemiBold.ttf",
  texte: "Inter-Regular.ttf",
  texteGras: "Inter-SemiBold.ttf",
};

/**
 * Les fichiers de police, lus une fois pour toutes.
 *
 * Le cache porte sur les octets, pas sur les polices embarquées : celles-ci
 * appartiennent à un document précis et ne se partagent pas d'un PDF à l'autre.
 */
let octetsPolices: Record<keyof Polices, Uint8Array> | null = null;

async function chargerPolices(): Promise<Record<keyof Polices, Uint8Array>> {
  if (octetsPolices) return octetsPolices;
  const dossier = join(process.cwd(), "docs", "fonts");
  const entrees = await Promise.all(
    (Object.entries(FICHIERS) as [keyof Polices, string][]).map(
      async ([cle, fichier]) =>
        [cle, new Uint8Array(await readFile(join(dossier, fichier)))] as const
    )
  );
  octetsPolices = Object.fromEntries(entrees) as Record<keyof Polices, Uint8Array>;
  return octetsPolices;
}

/**
 * Ce qu'on retire avant de mesurer ou d'écrire. Les caractères de contrôle,
 * que pdf-lib refuse. Et les espaces typographiques (insécable U+00A0, fine
 * insécable U+202F - celle qu'`Intl.NumberFormat` glisse entre les milliers en
 * français) : absentes du sous-ensemble de police, elles s'affichaient en
 * carré vide au milieu de chaque montant.
 */
function nettoyer(texte: string): string {
  return texte
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\u00a0\u202f\u2009]/g, " ");
}

export interface Colonne {
  /** Largeur en points. La somme doit tenir dans la largeur utile. */
  largeur: number;
  align?: "gauche" | "droite";
  /** Police grasse et encre foncée : pour la colonne qui porte le sujet. */
  fort?: boolean;
  gris?: boolean;
}

export class DocumentPdf {
  private pdf!: PDFDocument;
  private polices!: Polices;
  private page!: PDFPage;
  /** Ordonnée du curseur, en points depuis le bas de la page. */
  private y = 0;

  private constructor() {}

  static async creer(): Promise<DocumentPdf> {
    const doc = new DocumentPdf();
    doc.pdf = await PDFDocument.create();
    doc.pdf.registerFontkit(fontkit);

    const octets = await chargerPolices();
    // `subset` : seuls les glyphes employés sont embarqués. Sans lui, quatre
    // polices complètes pèsent plus lourd que le document entier.
    const embarquer = (o: Uint8Array) => doc.pdf.embedFont(o, { subset: true });
    doc.polices = {
      titre: await embarquer(octets.titre),
      titreGras: await embarquer(octets.titreGras),
      texte: await embarquer(octets.texte),
      texteGras: await embarquer(octets.texteGras),
    };

    doc.nouvellePage();
    return doc;
  }

  // -------------------------------------------------------------------------
  // Pages et curseur
  // -------------------------------------------------------------------------

  private nouvellePage() {
    this.page = this.pdf.addPage([A4.largeur, A4.hauteur]);
    this.y = A4.hauteur - MARGE;
  }

  /** Réserve `hauteur` points ; passe à la page suivante s'ils manquent. */
  private reserver(hauteur: number) {
    // La marge basse garde de la place pour le pied de page.
    if (this.y - hauteur < MARGE + 24) this.nouvellePage();
  }

  espace(points = 12) {
    this.y -= points;
  }

  // -------------------------------------------------------------------------
  // Texte
  // -------------------------------------------------------------------------

  private largeur(texte: string, police: PDFFont, taille: number): number {
    // Une police subsettée lève sur un caractère qu'elle ne connaît pas ; mieux
    // vaut une largeur approchée qu'un document qui ne se génère pas.
    try {
      return police.widthOfTextAtSize(nettoyer(texte), taille);
    } catch {
      return texte.length * taille * 0.5;
    }
  }

  /** Découpe un texte en lignes tenant dans `largeurMax`. */
  private decouper(texte: string, police: PDFFont, taille: number, largeurMax: number): string[] {
    const lignes: string[] = [];
    for (const paragraphe of texte.split(/\r?\n/)) {
      let courante = "";
      for (const mot of paragraphe.split(/\s+/).filter(Boolean)) {
        const essai = courante ? `${courante} ${mot}` : mot;
        if (this.largeur(essai, police, taille) <= largeurMax) {
          courante = essai;
        } else {
          if (courante) lignes.push(courante);
          courante = mot;
        }
      }
      lignes.push(courante);
    }
    return lignes.length ? lignes : [""];
  }

  private ecrire(
    texte: string,
    x: number,
    y: number,
    police: PDFFont,
    taille: number,
    couleur: RGB
  ) {
    const propre = nettoyer(texte);
    this.page.drawText(propre, { x, y, size: taille, font: police, color: couleur });
  }

  // -------------------------------------------------------------------------
  // Blocs
  // -------------------------------------------------------------------------

  /** Le bandeau de couverture : nom du cabinet, objet du document, client. */
  couverture(cabinet: string, objet: string, client: string, date: string) {
    const hauteur = 168;
    this.page.drawRectangle({
      x: 0,
      y: A4.hauteur - hauteur,
      width: A4.largeur,
      height: hauteur,
      color: COULEURS.ink,
    });
    // Un filet bronze ferme le bandeau : c'est lui qui donne le ton du document.
    this.page.drawRectangle({
      x: 0,
      y: A4.hauteur - hauteur,
      width: A4.largeur,
      height: 3,
      color: COULEURS.bronze,
    });

    this.ecrire(cabinet, MARGE, A4.hauteur - 62, this.polices.titreGras, 26, COULEURS.blanc);
    this.ecrire(objet.toUpperCase(), MARGE, A4.hauteur - 88, this.polices.texte, 8.5, COULEURS.bronzeClair);
    this.ecrire(client, MARGE, A4.hauteur - 126, this.polices.titre, 20, COULEURS.blanc);
    this.ecrire(date, MARGE, A4.hauteur - 146, this.polices.texte, 9, COULEURS.bronzeClair);

    this.y = A4.hauteur - hauteur - 28;
  }

  /** Un titre de section, souligné d'un filet bronze. */
  section(titre: string) {
    this.reserver(46);
    this.espace(6);
    this.ecrire(titre, MARGE, this.y - 12, this.polices.titreGras, 14, COULEURS.ink);
    this.page.drawRectangle({
      x: MARGE,
      y: this.y - 20,
      width: 34,
      height: 1.6,
      color: COULEURS.bronze,
    });
    this.y -= 34;
  }

  /**
   * Une bande de chiffres-clés, en cartes crème.
   *
   * Deux ou quatre par ligne selon leur nombre : trois cartes sur une largeur de
   * page laissent un blanc que l'œil lit comme une carte manquante.
   */
  kpis(items: { libelle: string; valeur: string }[]) {
    if (items.length === 0) return;
    const parLigne = items.length % 2 === 0 ? 2 : 1;
    const hauteur = 52;

    for (let i = 0; i < items.length; i += parLigne) {
      const groupe = items.slice(i, i + parLigne);
      this.reserver(hauteur + 8);
      const largeurCarte = (LARGEUR_UTILE - 10 * (parLigne - 1)) / parLigne;

      groupe.forEach((item, j) => {
        const x = MARGE + j * (largeurCarte + 10);
        this.page.drawRectangle({
          x,
          y: this.y - hauteur,
          width: largeurCarte,
          height: hauteur,
          color: COULEURS.cream,
        });
        this.page.drawRectangle({
          x,
          y: this.y - hauteur,
          width: 2.5,
          height: hauteur,
          color: COULEURS.bronze,
        });
        this.ecrire(
          item.libelle.toUpperCase(),
          x + 14,
          this.y - 19,
          this.polices.texte,
          7.5,
          COULEURS.warmGrey
        );
        this.ecrire(item.valeur, x + 14, this.y - 40, this.polices.texteGras, 15, COULEURS.ink);
      });

      this.y -= hauteur + 10;
    }
    this.espace(6);
  }

  /**
   * Une paire libellé / valeur sur deux colonnes.
   *
   * Les paires vides ne sont pas passées à cette méthode : c'est à l'appelant de
   * les écarter, un document d'audit ne devant pas être une liste de tirets.
   */
  paire(libelle: string, valeur: string) {
    const largeurLibelle = 168;
    const largeurValeur = LARGEUR_UTILE - largeurLibelle;
    const lignes = this.decouper(valeur, this.polices.texte, 9.5, largeurValeur);
    const hauteur = Math.max(16, lignes.length * 13 + 3);

    this.reserver(hauteur);
    this.ecrire(libelle, MARGE, this.y - 11, this.polices.texte, 9, COULEURS.warmGrey);
    lignes.forEach((ligne, i) => {
      this.ecrire(
        ligne,
        MARGE + largeurLibelle,
        this.y - 11 - i * 13,
        this.polices.texteGras,
        9.5,
        COULEURS.ink
      );
    });
    this.page.drawRectangle({
      x: MARGE,
      y: this.y - hauteur + 2,
      width: LARGEUR_UTILE,
      height: 0.6,
      color: COULEURS.creamDeep,
    });
    this.y -= hauteur;
  }

  /**
   * Un tableau. Les colonnes sont fixées par l'appelant ; l'en-tête se répète
   * en haut de chaque page, sans quoi une longue liste devient illisible dès la
   * deuxième feuille.
   */
  tableau(colonnes: Colonne[], entetes: string[], lignes: string[][], total?: string[]) {
    const dessinerEntetes = () => {
      this.reserver(22);
      this.page.drawRectangle({
        x: MARGE,
        y: this.y - 18,
        width: LARGEUR_UTILE,
        height: 18,
        color: COULEURS.creamDeep,
      });
      let x = MARGE;
      colonnes.forEach((colonne, i) => {
        const texte = (entetes[i] ?? "").toUpperCase();
        const largeurTexte = this.largeur(texte, this.polices.texteGras, 7.5);
        const posX = colonne.align === "droite" ? x + colonne.largeur - largeurTexte - 8 : x + 8;
        this.ecrire(texte, posX, this.y - 12.5, this.polices.texteGras, 7.5, COULEURS.warmGrey);
        x += colonne.largeur;
      });
      this.y -= 18;
    };

    dessinerEntetes();

    for (const ligne of lignes) {
      // Hauteur dictée par la cellule la plus bavarde.
      const decoupes = colonnes.map((colonne, i) =>
        this.decouper(ligne[i] ?? "", this.polices.texte, 8.5, colonne.largeur - 16)
      );
      const hauteur = Math.max(18, Math.max(...decoupes.map((d) => d.length)) * 11 + 7);

      const avant = this.y;
      this.reserver(hauteur);
      // Le saut de page a eu lieu : l'en-tête doit repartir avec le tableau.
      if (this.y > avant) dessinerEntetes();

      let x = MARGE;
      colonnes.forEach((colonne, i) => {
        const police = colonne.fort ? this.polices.texteGras : this.polices.texte;
        const couleur = colonne.gris ? COULEURS.warmGrey : COULEURS.charcoal;
        decoupes[i].forEach((texte, j) => {
          const largeurTexte = this.largeur(texte, police, 8.5);
          const posX = colonne.align === "droite" ? x + colonne.largeur - largeurTexte - 8 : x + 8;
          this.ecrire(texte, posX, this.y - 12 - j * 11, police, 8.5, couleur);
        });
        x += colonne.largeur;
      });

      this.page.drawRectangle({
        x: MARGE,
        y: this.y - hauteur + 2,
        width: LARGEUR_UTILE,
        height: 0.6,
        color: COULEURS.creamDeep,
      });
      this.y -= hauteur;
    }

    if (total) {
      this.reserver(22);
      this.page.drawRectangle({
        x: MARGE,
        y: this.y - 20,
        width: LARGEUR_UTILE,
        height: 20,
        color: COULEURS.cream,
      });
      let x = MARGE;
      colonnes.forEach((colonne, i) => {
        const texte = total[i] ?? "";
        const largeurTexte = this.largeur(texte, this.polices.texteGras, 9);
        const posX = colonne.align === "droite" ? x + colonne.largeur - largeurTexte - 8 : x + 8;
        this.ecrire(texte, posX, this.y - 13.5, this.polices.texteGras, 9, COULEURS.ink);
        x += colonne.largeur;
      });
      this.y -= 22;
    }

    this.espace(8);
  }

  /** Une ligne de verdict : pastille colorée, intitulé, valeur, critère. */
  verdict(libelle: string, valeur: string, attendu: string, conforme: boolean | null) {
    this.reserver(22);
    const couleur =
      conforme === null ? COULEURS.warmGrey : conforme ? COULEURS.vert : COULEURS.rouge;

    this.page.drawCircle({ x: MARGE + 4, y: this.y - 9, size: 3.2, color: couleur });
    this.ecrire(libelle, MARGE + 16, this.y - 12, this.polices.texte, 9.5, COULEURS.ink);

    const largeurValeur = this.largeur(valeur, this.polices.texteGras, 9.5);
    this.ecrire(
      valeur,
      MARGE + LARGEUR_UTILE - largeurValeur - 92,
      this.y - 12,
      this.polices.texteGras,
      9.5,
      couleur
    );

    const largeurAttendu = this.largeur(attendu, this.polices.texte, 8.5);
    this.ecrire(
      attendu,
      MARGE + LARGEUR_UTILE - largeurAttendu,
      this.y - 12,
      this.polices.texte,
      8.5,
      COULEURS.warmGrey
    );

    this.page.drawRectangle({
      x: MARGE,
      y: this.y - 20,
      width: LARGEUR_UTILE,
      height: 0.6,
      color: COULEURS.creamDeep,
    });
    this.y -= 22;
  }

  /** Un paragraphe de note, en petit et en gris. */
  note(texte: string) {
    const lignes = this.decouper(texte, this.polices.texte, 8, LARGEUR_UTILE);
    this.reserver(lignes.length * 11 + 8);
    lignes.forEach((ligne, i) => {
      this.ecrire(ligne, MARGE, this.y - 9 - i * 11, this.polices.texte, 8, COULEURS.warmGrey);
    });
    this.y -= lignes.length * 11 + 8;
  }

  /** Une phrase quand une liste est vide - préférable à une section absente. */
  rien(texte: string) {
    this.reserver(20);
    this.ecrire(texte, MARGE, this.y - 11, this.polices.texte, 9, COULEURS.warmGrey);
    this.y -= 20;
  }

  // -------------------------------------------------------------------------
  // Clôture
  // -------------------------------------------------------------------------

  /**
   * Pieds de page et enregistrement.
   *
   * La numérotation ne peut être écrite qu'ici : le nombre total de pages n'est
   * connu qu'une fois tout le contenu posé.
   */
  async terminer(mention: string): Promise<Uint8Array> {
    const pages = this.pdf.getPages();
    pages.forEach((page, i) => {
      page.drawRectangle({
        x: MARGE,
        y: MARGE - 12,
        width: LARGEUR_UTILE,
        height: 0.6,
        color: COULEURS.creamDeep,
      });
      page.drawText(mention, {
        x: MARGE,
        y: MARGE - 24,
        size: 7.5,
        font: this.polices.texte,
        color: COULEURS.warmGrey,
      });
      const numero = `${i + 1} / ${pages.length}`;
      const largeur = this.polices.texte.widthOfTextAtSize(numero, 7.5);
      page.drawText(numero, {
        x: MARGE + LARGEUR_UTILE - largeur,
        y: MARGE - 24,
        size: 7.5,
        font: this.polices.texte,
        color: COULEURS.warmGrey,
      });
    });

    return this.pdf.save();
  }

  /** Largeur disponible entre les marges, pour dimensionner les colonnes. */
  static get largeurUtile(): number {
    return LARGEUR_UTILE;
  }
}
