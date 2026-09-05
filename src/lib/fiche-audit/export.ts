import { remplirClasseur, type Ecritures, type Valeur } from "@/lib/xlsx/classeur";
import { assetTypeLabel } from "@/lib/patrimoine";
import { calculer } from "./calculs";
import { MAX_OBJECTIFS, type FicheAudit } from "./schema";

/**
 * Remplissage du classeur d'audit du cabinet.
 *
 * Les références de cellules viennent du modèle lui-même : chaque intitulé y est
 * suivi d'une cellule fusionnée qui attend la valeur (« Adresse » en B5:C5, sa
 * saisie en D5:F5). Les cellules de formule ne sont jamais écrites - le taux
 * d'endettement, les totaux et les ratios restent calculés par Excel, à partir
 * de ce qu'on vient de poser.
 */

/** Nombre de lignes que la feuille FINANCIER peut accueillir (B5:B25). */
const LIGNES_FINANCIER = 21;
const PREMIERE_LIGNE_FINANCIER = 5;

/** Bandes de texte libre de la feuille des objectifs. */
const PREMIERE_LIGNE_OBJECTIFS = 12;
const DERNIERE_LIGNE_OBJECTIFS = PREMIERE_LIGNE_OBJECTIFS + MAX_OBJECTIFS - 1;

/**
 * La devise est portée par les formats de nombre du classeur, pas par les
 * cellules : douze formats y écrivent « € ». On les repasse en dirhams à
 * l'export, le modèle d'origine restant intact dans le dépôt.
 */
const FORMATS_DIRHAM = [
  { de: "&quot;€&quot;", vers: "&quot;MAD&quot;" },
  { de: "[$€-40C]", vers: "&quot;MAD&quot;" },
  { de: "_€", vers: "_MAD" },
];

/**
 * Largeur minimale forcée sur toute colonne qu'un format `FORMATS_DIRHAM`
 * touche, sur n'importe quelle feuille - `remplirClasseur` les repère
 * elle-même. « MAD » compte trois caractères de plus que « € », et ces
 * formats apparaissent sur des dizaines de colonnes dispersées dans tout le
 * classeur ; les avoir énumérées à la main en avait manqué la moitié.
 */
const LARGEUR_MINIMALE_DIRHAM = 18;

/**
 * Intitulés du modèle que l'adaptation marocaine remplace.
 *
 * Le classeur d'origine parle de SCPI et de parts fiscales, deux notions
 * françaises. La SCPI a un équivalent local, l'OPCI ; le quotient familial,
 * lui, n'existe pas dans l'IR marocain et cède la place aux personnes à charge.
 */
const INTITULES: Ecritures = {
  REVENUS: { B10: "Personnes à charge" },
  "Tx d'endettement": {
    E4: "Montant potentiel en OPCI (sans prendre en compte l'endettement)",
    E10: "Taux d'endettement post-opération en OPCI",
  },
  SIMULATEUR: {
    E4: "Revenus titulaire",
    F4: "Revenus conjoint",
    B13: "Investissement OPCI",
    C13: "Montant d'investissement OPCI",
    C16: "Mensualité du prêt OPCI",
    C17: "Revenus de l'OPCI pris en compte",
    C19: "Taux d'endettement après opération OPCI",
  },
};

/** Un montant nul n'est pas écrit : une case vide se lit mieux qu'un « 0 MAD ». */
function argent(valeur: number): Valeur {
  return valeur > 0 ? valeur : null;
}

function texte(valeur: string): Valeur {
  return valeur.trim() === "" ? null : valeur.trim();
}

function ouiNon(valeur: boolean): string {
  return valeur ? "Oui" : "Non";
}

function ecrituresRevenus(fiche: FicheAudit): Record<string, Valeur> {
  const { titulaire: t, conjoint: c, foyer, fiscalite } = fiche;
  return {
    // État civil - titulaire en colonne C, conjoint en colonne H.
    C3: texte(t.nom),
    C4: texte(t.prenom),
    C5: texte(t.email),
    C6: texte(t.telephone),
    C7: texte(t.naissance),
    H3: texte(c.nom),
    H4: texte(c.prenom),
    H5: texte(c.email),
    H6: texte(c.telephone),
    H7: texte(c.naissance),

    // Foyer : saisi une seule fois, le modèle fusionne la zone du conjoint.
    C8: texte(foyer.situationFamiliale),
    E8: texte(foyer.regimeMatrimonial),
    C9: foyer.nbEnfants > 0 ? foyer.nbEnfants : null,
    E9: texte(foyer.agesEnfants),
    C10: foyer.personnesACharge > 0 ? foyer.personnesACharge : null,
    C12: texte(foyer.remarques),

    // Revenus : le brut annuel (D21, I21) est une formule du classeur.
    C16: texte(t.profession),
    C17: texte(t.entreprise),
    C18: texte(t.anciennete),
    C19: texte(t.statut),
    D20: argent(t.revenuFixe),
    F20: argent(t.revenuVariable),
    H16: texte(c.profession),
    H17: texte(c.entreprise),
    H18: texte(c.anciennete),
    H19: texte(c.statut),
    I20: argent(c.revenuFixe),
    K20: argent(c.revenuVariable),

    C27: texte(fiscalite.reductions),
    C28: texte(fiscalite.investissementsFiscaux),
    C30: texte(fiscalite.remarques),
  };
}

function ecrituresImmobilier(fiche: FicheAudit): Record<string, Valeur> {
  const { residencePrincipale: rp, locatifs, credits } = fiche.immobilier;
  const premier = locatifs[0];
  const [credit1, credit2] = credits;

  const ecritures: Record<string, Valeur> = {
    // Résidence principale.
    D5: texte(rp.adresse),
    D6: texte(rp.situation),
    F6: argent(rp.loyerMensualite),
    D7: argent(rp.valeurEstimee),
    F7: argent(rp.valeurAchat),
    D8: argent(rp.capitalEmprunte),
    F8: texte(rp.dateAchat),
    D9: argent(rp.capitalRestantDu),
    F9: texte(rp.dureeEmprunt),
    C10: texte(rp.remarques),

    // Résidence secondaire ou locative : le modèle n'en prévoit qu'une.
    D14: texte(premier?.adresse ?? ""),
    D15: argent(premier?.valeurEstimee ?? 0),
    F15: argent(premier?.valeurAchat ?? 0),
    D16: argent(premier?.capitalEmprunte ?? 0),
    F16: argent(premier?.mensualites ?? 0),
    D17: argent(premier?.capitalRestantDu ?? 0),
    F17: texte(premier?.dureeEmprunt ?? ""),
    D18: argent(premier?.loyersPercus ?? 0),
    C19: texte(premier?.remarques ?? ""),

    C23: texte(credit1?.designation ?? ""),
    C24: argent(credit1?.capitalEmprunte ?? 0),
    E24: argent(credit1?.capitalRestantDu ?? 0),
    G24: argent(credit1?.mensualites ?? 0),
    I24: texte(credit1?.duree ?? ""),

    C26: texte(credit2?.designation ?? ""),
    C27: argent(credit2?.capitalEmprunte ?? 0),
    E27: argent(credit2?.capitalRestantDu ?? 0),
    G27: argent(credit2?.mensualites ?? 0),
    I27: texte(credit2?.duree ?? ""),
  };

  return ecritures;
}

function ecrituresFinancier(fiche: FicheAudit): Record<string, Valeur> {
  const ecritures: Record<string, Valeur> = {
    // « Détenteur » est une seule cellule fusionnée pour tout le tableau.
    B5: texte(`${fiche.titulaire.prenom} ${fiche.titulaire.nom}`),
  };

  const lignes = fiche.financier.slice(0, LIGNES_FINANCIER);
  for (let i = 0; i < LIGNES_FINANCIER; i++) {
    const ligne = lignes[i];
    const r = PREMIERE_LIGNE_FINANCIER + i;
    // Les lignes au-delà de la saisie sont vidées : le modèle arrive avec des
    // produits pré-imprimés (Livret A, PEA…) qui n'ont pas à rester sur la
    // fiche d'un client marocain.
    ecritures[`C${r}`] = ligne ? texte(ligne.libelle || assetTypeLabel(ligne.type)) : null;
    ecritures[`D${r}`] = ligne ? argent(ligne.valeur) : null;
    ecritures[`E${r}`] = ligne ? texte(ligne.dateSouscription) : null;
    ecritures[`F${r}`] = ligne ? texte(ligne.remarques) : null;
  }
  return ecritures;
}

function ecrituresObjectifs(fiche: FicheAudit): Record<string, Valeur> {
  const { profil } = fiche;
  const ecritures: Record<string, Valeur> = {
    C3: ouiNon(profil.usPerson),
    E3: ouiNon(profil.politiquementExpose),
    G3: ouiNon(profil.biensDivers),
    D7: argent(profil.effortEpargne),
  };

  for (let r = PREMIERE_LIGNE_OBJECTIFS; r <= DERNIERE_LIGNE_OBJECTIFS; r++) {
    ecritures[`B${r}`] = texte(profil.objectifs[r - PREMIERE_LIGNE_OBJECTIFS] ?? "");
  }
  return ecritures;
}

function ecrituresSimulateur(fiche: FicheAudit): Record<string, Valeur> {
  const { simulation, immobilier, foyer } = fiche;
  const c = calculer(fiche);

  return {
    D6: texte(immobilier.residencePrincipale.situation) ?? "Locataire",
    D7: foyer.situationFamiliale === "Marié(e)" ? "En couple" : "Célibataire",
    D13: argent(simulation.montant),
    D14: simulation.tauxHorsAssurance > 0 ? simulation.tauxHorsAssurance : null,
    D15: simulation.dureeMois > 0 ? simulation.dureeMois : null,
    /**
     * E5 porte « Revenus titulaire » mais, dans le modèle d'origine, sa formule
     * pointe sur le net du foyer entier - que D5 additionne ensuite au net du
     * conjoint, compté deux fois. On y écrit la valeur juste : D5 redevient le
     * net du foyer, et tous les ratios en aval avec lui.
     */
    E5: c.netMensuelTitulaire > 0 ? c.netMensuelTitulaire : null,
  };
}

/**
 * Ce que le modèle ne pourra pas accueillir tel quel.
 *
 * Exportée à part de `classeurRempli` pour que l'admin puisse prévenir le
 * conseiller *avant* le téléchargement (une bannière sur la page de la fiche),
 * pas seulement dans un en-tête HTTP qu'un clic sur un lien ne montre jamais.
 * Le silence serait pire - un conseiller croirait exporter tout son dossier.
 */
export function omissionsClasseur(fiche: FicheAudit): string[] {
  const omissions: string[] = [];
  const enTrop = (n: number, limite: number, quoi: string) => {
    if (n > limite) omissions.push(`${n - limite} ${quoi} au-delà de ce que le modèle prévoit`);
  };
  enTrop(fiche.immobilier.locatifs.length, 1, "bien(s) locatif(s)");
  enTrop(fiche.immobilier.credits.length, 2, "crédit(s)");
  enTrop(fiche.financier.length, LIGNES_FINANCIER, "ligne(s) financière(s)");
  // Pas de vérification pour les objectifs : le schéma plafonne déjà le
  // tableau à `MAX_OBJECTIFS`, exactement la capacité du classeur - il ne
  // peut jamais y en avoir « en trop ».
  return omissions;
}

/** Produit le classeur rempli pour un client. */
export function classeurRempli(
  gabarit: Uint8Array,
  fiche: FicheAudit
): { classeur: Uint8Array; omissions: string[] } {
  const ecritures: Ecritures = {
    REVENUS: { ...INTITULES.REVENUS, ...ecrituresRevenus(fiche) },
    IMMOBILIER: ecrituresImmobilier(fiche),
    FINANCIER: ecrituresFinancier(fiche),
    "Tx d'endettement": { ...INTITULES["Tx d'endettement"] },
    "OBJECTIFS ET EFFORT": ecrituresObjectifs(fiche),
    SIMULATEUR: { ...INTITULES.SIMULATEUR, ...ecrituresSimulateur(fiche) },
  };

  const { classeur } = remplirClasseur(gabarit, ecritures, {
    formatsNombres: FORMATS_DIRHAM,
    largeurMinimaleAuto: LARGEUR_MINIMALE_DIRHAM,
  });
  return { classeur, omissions: omissionsClasseur(fiche) };
}

/** Nom de fichier proposé au téléchargement. */
export function nomFichierAudit(fiche: FicheAudit, date: Date): string {
  const nom = [fiche.titulaire.prenom, fiche.titulaire.nom]
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[0300-036f]/g, "")
    .replace(/[^A-Za-z0-9-]/g, "")
    .toLowerCase();
  const jour = date.toISOString().slice(0, 10);
  return `audit-${nom || "client"}-${jour}.xlsx`;
}
