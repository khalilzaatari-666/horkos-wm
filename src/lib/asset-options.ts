/** Shared by the cession form and its server action, so the two can't drift. */

export const assetGroups = [
  {
    label: "Immobilier",
    options: [
      "Résidence (principale ou secondaire)",
      "Bien locatif résidentiel",
      "Local commercial",
      "Immeuble de rapport",
      "Terrain",
      "Actif hôtelier / parahôtelier",
      "Programme immobilier en développement",
    ],
  },
  {
    label: "Entreprise & participations",
    options: [
      "Entreprise - cession totale",
      "Participation minoritaire",
      "Part de SCI / société patrimoniale",
      "Participation dans un fonds ou club deal",
    ],
  },
  {
    label: "Actifs financiers",
    options: ["Portefeuille de valeurs mobilières", "Contrat d'assurance-vie existant"],
  },
  {
    label: "Autres",
    options: ["Œuvre d'art", "Autre actif"],
  },
] as const;

export const assetTypeOptions = assetGroups.flatMap((g) => g.options) as unknown as [
  string,
  ...string[],
];

export const cessionReasonOptions = [
  "Succession / transmission en cours",
  "Besoin de liquidités",
  "Réorientation de la stratégie patrimoniale",
  "Départ à la retraite",
  "Divorce / séparation",
  "Simplification du patrimoine",
  "Opportunité de marché",
  "Autre raison",
] as const;

/** Above this, a numeric input stops being plausible and starts being a typo. */
export const ESTIMATED_VALUE_MAX = 100_000_000_000;
export const DESCRIPTION_MAX = 2000;
export const HORIZON_MAX = 60;
