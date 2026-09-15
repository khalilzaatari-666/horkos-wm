/** Shared between the form and the server action, so the two can't drift. */

/**
 * Les sept besoins « Pour vous » du carrousel de l'accueil se retrouvent ici à
 * l'identique - `besoinsParticuliers` dans `@/lib/besoins` est typé dessus, donc
 * renommer d'un côté sans l'autre ne compile pas. Les deux besoins « Pour votre
 * entreprise » n'en font délibérément pas partie.
 */
export const besoinOptions = [
  "Structurer mon patrimoine",
  "Préparer ma retraite",
  "Transmettre à mes enfants",
  "Diversifier mes investissements",
  "Optimiser ma fiscalité",
  "Structurer une société patrimoniale",
  "Céder un actif",
  "Autre besoin",
] as const;

/**
 * Dernière option des deux questions de montant : on préfère une réponse
 * honnête à une tranche choisie au hasard. Le conseiller la lit telle quelle.
 */
export const MONTANT_NON_PARTAGE = "Je ne souhaite pas partager cette information";

export const patrimoineOptions = [
  "1M - 3M MAD",
  "3M - 5M MAD",
  "5M - 10M MAD",
  "10M - 20M MAD",
  "Plus de 20M MAD",
  MONTANT_NON_PARTAGE,
] as const;

export const investissementOptions = [
  "100K - 1M MAD",
  "1M - 3M MAD",
  "3M - 5M MAD",
  "5M - 10M MAD",
  "Plus de 10M MAD",
  MONTANT_NON_PARTAGE,
] as const;

/** « Comment avez-vous découvert Horkos ? » - le canal, pour savoir lequel amène qui. */
export const sourceOptions = [
  "Recommandation",
  "LinkedIn",
  "Presse / Média",
  "Événement",
  "Podcast",
  "Ressource Horkos (guide, blog)",
  "Moteur de recherche",
  "Par un conseiller privé",
] as const;

/** Ville de résidence : saisie libre, bornée. */
export const VILLE_MAX = 80;

export type BesoinOption = (typeof besoinOptions)[number];
export type PatrimoineOption = (typeof patrimoineOptions)[number];
export type InvestissementOption = (typeof investissementOptions)[number];
export type SourceOption = (typeof sourceOptions)[number];
