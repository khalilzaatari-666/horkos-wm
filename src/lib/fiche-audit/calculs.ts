import type { FicheAudit, Personne } from "./schema";

/**
 * Les calculs du classeur d'audit, réécrits en TypeScript.
 *
 * Ils vivent ici plutôt que dans le formulaire pour trois raisons : le
 * conseiller voit les résultats se mettre à jour pendant la saisie, l'export
 * Excel repart des mêmes nombres, et chaque règle est vérifiable seule - ce sont
 * des chiffres sur lesquels le cabinet engage un conseil.
 *
 * Les coefficients viennent du modèle du cabinet. Ils sont nommés et groupés
 * ici parce qu'ils incarnent une politique, pas une vérité : les changer est une
 * décision du cabinet, pas une correction de code.
 */

/** Part du brut qui reste en net. Le modèle retient 77 %. */
export const TAUX_NET_SUR_BRUT = 0.77;

/** Part des loyers retenue par les banques dans le calcul d'endettement. */
export const PART_LOYERS_RETENUE = 0.7;

/**
 * Rendement locatif d'un placement OPCI. Fixe, pas un défaut : le classeur
 * d'origine l'écrit en dur dans sa formule, sans cellule d'entrée.
 */
export const RENDEMENT_OPCI_DEFAUT = 0.055;

/**
 * Seuils de validation d'un dossier.
 *
 * ATTENTION : ces montants sont ceux du modèle d'origine, exprimés dans sa
 * devise. Le reste de la fiche a été passé en dirhams ; ces seuils-là, non - le
 * cabinet doit arrêter ses propres montants avant de s'appuyer sur le verdict
 * « restant à vivre ». Les ratios (endettement, épargne) sont sans dimension et
 * restent valables tels quels.
 */
export const SEUILS = {
  /** Taux d'endettement maximal après opération. */
  endettementMax: 0.45,
  /** Ratio d'épargne minimal, et cible. */
  epargneMin: 0.1,
  epargneCible: 0.15,
  /** Restant à vivre : base célibataire, base couple, majoration par enfant. */
  restantSeul: 1500,
  restantCouple: 2000,
  restantParEnfant: 500,
} as const;

export interface Endettement {
  revenuMensuelNet: number;
  chargeLogement: number;
  loyersPercus: number;
  loyersRetenus: number;
  chargeLocative: number;
  chargeAutresCredits: number;
  capitalRestantDuTotal: number;
  /** Charge de logement rapportée aux seuls revenus du travail. */
  apresRevenus: number | null;
  /** En tenant compte des biens locatifs. */
  apresAutresActifs: number | null;
  /** Toutes charges et tous revenus confondus. */
  total: number | null;
}

export interface Simulation {
  mensualite: number;
  revenusProduitRetenus: number;
  tauxEndettement: number | null;
  ratioPassif: number;
  restantAVivre: number;
  restantAVivreMinimum: number;
  ratioEpargne: number | null;
  verdicts: { libelle: string; valeur: string; conforme: boolean | null; attendu: string }[];
}

export interface Calculs {
  brutTitulaire: number;
  brutConjoint: number;
  brutFoyer: number;
  netMensuelTitulaire: number;
  netMensuelConjoint: number;
  totalFinancier: number;
  totalImmobilier: number;
  totalDettes: number;
  patrimoineBrut: number;
  patrimoineNet: number;
  endettement: Endettement;
  simulation: Simulation;
}

/** Brut annuel : le modèle additionne la part fixe et la part variable. */
export function brutAnnuel(p: Personne): number {
  return (p.revenuFixe || 0) + (p.revenuVariable || 0);
}

function netMensuel(brut: number): number {
  return (brut * TAUX_NET_SUR_BRUT) / 12;
}

/** Une division qui rend `null` plutôt que `Infinity` quand le diviseur est nul. */
function ratio(numerateur: number, denominateur: number): number | null {
  return denominateur > 0 ? numerateur / denominateur : null;
}

/**
 * Mensualité d'un prêt, équivalent de `PMT` d'Excel.
 *
 * `taux` est annuel, la mensualité est calculée au taux périodique. Un taux nul
 * dégénère en simple division, que la formule générale ne sait pas traiter.
 */
export function mensualitePret(montant: number, tauxAnnuel: number, dureeMois: number): number {
  if (montant <= 0 || dureeMois <= 0) return 0;
  const t = tauxAnnuel / 12;
  if (t === 0) return montant / dureeMois;
  const facteur = Math.pow(1 + t, dureeMois);
  return (montant * t * facteur) / (facteur - 1);
}

function calculerEndettement(fiche: FicheAudit): Endettement {
  const { residencePrincipale: rp, locatifs, credits } = fiche.immobilier;

  const revenuMensuelNet =
    netMensuel(brutAnnuel(fiche.titulaire)) + netMensuel(brutAnnuel(fiche.conjoint));

  // Loyer si le client est locataire, mensualité de crédit s'il est propriétaire :
  // dans les deux cas, ce que son logement lui coûte chaque mois.
  const chargeLogement = rp.loyerMensualite || 0;

  const somme = (valeurs: number[]) => valeurs.reduce((t, v) => t + v, 0);
  const loyersPercus = somme(locatifs.map((b) => b.loyersPercus || 0));
  const chargeLocative = somme(locatifs.map((b) => b.mensualites || 0));
  const chargeAutresCredits = somme(credits.map((c) => c.mensualites || 0));

  const capitalRestantDuTotal =
    (rp.capitalRestantDu || 0) +
    somme(locatifs.map((b) => b.capitalRestantDu || 0)) +
    somme(credits.map((c) => c.capitalRestantDu || 0));

  const loyersRetenus = loyersPercus * PART_LOYERS_RETENUE;

  return {
    revenuMensuelNet,
    chargeLogement,
    loyersPercus,
    loyersRetenus,
    chargeLocative,
    chargeAutresCredits,
    capitalRestantDuTotal,
    apresRevenus: ratio(chargeLogement, revenuMensuelNet),
    apresAutresActifs: ratio(chargeLogement + chargeLocative, revenuMensuelNet + loyersRetenus),
    total: ratio(
      chargeLogement + chargeLocative + chargeAutresCredits,
      revenuMensuelNet + loyersRetenus
    ),
  };
}

function formatPourcent(v: number | null): string {
  return v === null ? "—" : `${(v * 100).toFixed(1).replace(".", ",")} %`;
}

function calculerSimulation(
  fiche: FicheAudit,
  endettement: Endettement,
  totalFinancier: number
): Simulation {
  const { montant, tauxHorsAssurance, dureeMois } = fiche.simulation;

  const mensualite = mensualitePret(montant, tauxHorsAssurance, dureeMois);
  // Le classeur d'origine écrit ce taux en dur dans la formule (« *0.055/12 »),
  // sans cellule d'entrée : ce n'est pas un paramètre du dossier, c'est une
  // caractéristique du produit OPCI simulé. Le rendre modifiable ferait
  // diverger le résultat de celui du classeur dès qu'il diffère de 5,5 %.
  const revenusProduitRetenus = ((montant * RENDEMENT_OPCI_DEFAUT) / 12) * PART_LOYERS_RETENUE;

  const charges =
    endettement.chargeLogement + endettement.chargeLocative + endettement.chargeAutresCredits;

  // Le classeur d'origine additionne ici le net du foyer ET, une seconde fois,
  // celui du conjoint - la cellule censée porter « Revenus Mr » pointe sur le
  // total. On retient le foyer une seule fois.
  const revenus = endettement.revenuMensuelNet;
  const revenusRetenus = revenus + revenusProduitRetenus + endettement.loyersRetenus;

  const tauxEndettement = ratio(charges + mensualite, revenusRetenus);

  // Le modèle admet un passif plus lourd chez un propriétaire, sa résidence
  // principale constituant déjà un actif.
  const multiple = fiche.immobilier.residencePrincipale.situation === "Propriétaire" ? 8 : 5;
  const ratioPassif = multiple * revenus * 12 - (montant + endettement.capitalRestantDuTotal);

  const restantAVivre = revenusRetenus - (charges + mensualite);
  const enCouple = ["Marié(e)"].includes(fiche.foyer.situationFamiliale);
  const restantAVivreMinimum =
    (enCouple ? SEUILS.restantCouple : SEUILS.restantSeul) +
    fiche.foyer.nbEnfants * SEUILS.restantParEnfant;

  const ratioEpargne = ratio(totalFinancier, montant);

  return {
    mensualite,
    revenusProduitRetenus,
    tauxEndettement,
    ratioPassif,
    restantAVivre,
    restantAVivreMinimum,
    ratioEpargne,
    verdicts: [
      {
        libelle: "Taux d'endettement après opération",
        valeur: formatPourcent(tauxEndettement),
        conforme: tauxEndettement === null ? null : tauxEndettement < SEUILS.endettementMax,
        attendu: `< ${SEUILS.endettementMax * 100} %`,
      },
      {
        libelle: "Ratio passif",
        valeur: Math.round(ratioPassif).toLocaleString("fr-FR"),
        conforme: ratioPassif > 0,
        attendu: "> 0",
      },
      {
        libelle: "Restant à vivre",
        valeur: Math.round(restantAVivre).toLocaleString("fr-FR"),
        conforme: restantAVivre > restantAVivreMinimum,
        attendu: `> ${restantAVivreMinimum.toLocaleString("fr-FR")}`,
      },
      {
        libelle: "Ratio d'épargne",
        valeur: formatPourcent(ratioEpargne),
        conforme: ratioEpargne === null ? null : ratioEpargne > SEUILS.epargneMin,
        attendu: `> ${SEUILS.epargneMin * 100} % (cible ${SEUILS.epargneCible * 100} %)`,
      },
    ],
  };
}

/** Tout ce que la fiche permet de déduire, en un seul passage. */
export function calculer(fiche: FicheAudit): Calculs {
  const brutTitulaire = brutAnnuel(fiche.titulaire);
  const brutConjoint = brutAnnuel(fiche.conjoint);

  const totalFinancier = fiche.financier.reduce((t, l) => t + (l.valeur || 0), 0);
  const totalImmobilier =
    (fiche.immobilier.residencePrincipale.valeurEstimee || 0) +
    fiche.immobilier.locatifs.reduce((t, b) => t + (b.valeurEstimee || 0), 0);

  const endettement = calculerEndettement(fiche);
  const simulation = calculerSimulation(fiche, endettement, totalFinancier);
  const patrimoineBrut = totalFinancier + totalImmobilier;

  return {
    brutTitulaire,
    brutConjoint,
    brutFoyer: brutTitulaire + brutConjoint,
    netMensuelTitulaire: netMensuel(brutTitulaire),
    netMensuelConjoint: netMensuel(brutConjoint),
    totalFinancier,
    totalImmobilier,
    totalDettes: endettement.capitalRestantDuTotal,
    patrimoineBrut,
    patrimoineNet: patrimoineBrut - endettement.capitalRestantDuTotal,
    endettement,
    simulation,
  };
}
