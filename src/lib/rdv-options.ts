/** Shared between the form and the server action, so the two can't drift. */

export const besoinOptions = [
  "Structurer mon patrimoine",
  "Préparer ma retraite",
  "Transmettre à mes enfants",
  "Diversifier mes investissements",
  "Optimiser ma fiscalité",
  "Structurer une société",
  "Céder un actif",
  "Autre besoin",
] as const;

export const patrimoineOptions = [
  "1M - 3M MAD",
  "3M - 5M MAD",
  "5M - 10M MAD",
  "10M - 20M MAD",
  "Plus de 20M MAD",
] as const;

export const investissementOptions = [
  "1M - 3M MAD",
  "3M - 5M MAD",
  "5M - 10M MAD",
  "Plus de 10M MAD",
] as const;

export type BesoinOption = (typeof besoinOptions)[number];
export type PatrimoineOption = (typeof patrimoineOptions)[number];
export type InvestissementOption = (typeof investissementOptions)[number];
