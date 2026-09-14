/**
 * Questionnaire de partenariat (page /conseil/reseau).
 *
 * Partagé par le formulaire et sa server action, pour que les deux ne puissent
 * pas diverger. Chaque catégorie a ses propres champs ; les listes fermées sont
 * déclarées ici une seule fois et validées serveur par `z.enum`.
 */

export const partnerCategories = ["gestion", "assureur", "immo", "fonds", "club"] as const;
export type PartnerCategory = (typeof partnerCategories)[number];

/** Libellé enregistré tel quel dans `partner_submissions.partner_type`. */
export const partnerCategoryLabels: Record<PartnerCategory, string> = {
  gestion: "Société de gestion",
  assureur: "Assureur",
  immo: "Agent immobilier",
  fonds: "Fonds Private Equity / Venture Capital",
  club: "Club deal / partenariat business",
};

export const gestionFondsOptions = [
  "OPCVM actions",
  "OPCVM obligataire",
  "OPCVM diversifié",
  "OPCVM monétaire",
  "Autre véhicule de gestion",
] as const;

export const assureurProduitOptions = [
  "Assurance-vie multisupport",
  "PER - Plan d'Épargne Retraite",
  "Prévoyance patrimoniale",
  "Autre produit d'assurance",
] as const;

export const ouiNonOptions = ["Oui", "Non"] as const;

export const immoBienOptions = [
  "Résidentiel",
  "Local commercial",
  "Immeuble de rapport",
  "Terrain",
  "Actif hôtelier / parahôtelier",
  "Programme neuf",
] as const;

export const fondsLeveeOptions = ["Private Equity", "Venture Capital"] as const;

export const fondsStadeOptions = [
  "Amorçage / Seed",
  "Série A",
  "Croissance",
  "Transmission / LBO",
] as const;

export const clubNatureOptions = [
  "Club deal immobilier",
  "Partenariat commercial",
  "Apport d'affaires",
  "Autre partenariat",
] as const;

/** Bornes des champs libres propres à ce formulaire. */
export const COMPANY_MAX = 120;
export const SHORT_TEXT_MAX = 120;
export const DETAIL_MAX = 2000;
