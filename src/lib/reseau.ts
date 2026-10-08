/**
 * Le réseau que Horkos coordonne autour du client, tel que le site le décrit :
 * les professionnels qui mettent en œuvre une structuration, et ceux qui
 * apportent des opportunités d'investissement. Une seule source pour l'orbite
 * de l'accueil et pour la page Réseau.
 */
export interface Metier {
  title: string;
  /** Quand Horkos le mobilise, en une phrase. */
  desc: string;
  cercle: "miseEnOeuvre" | "sourcing";
}

export const CERCLES = {
  miseEnOeuvre: "Mise en œuvre",
  sourcing: "Opportunités",
} as const;

export const METIERS: Metier[] = [
  {
    title: "Notaire",
    desc: "Pour la création d’une société patrimoniale, un apport de bien ou une transmission préparée en amont.",
    cercle: "miseEnOeuvre",
  },
  {
    title: "Expert-comptable",
    desc: "Pour la tenue comptable déléguée d’une société patrimoniale, une fois le montage en place.",
    cercle: "miseEnOeuvre",
  },
  {
    title: "Avocat fiscaliste",
    desc: "Pour sécuriser un montage et son régime fiscal avant toute mise en œuvre.",
    cercle: "miseEnOeuvre",
  },
  {
    title: "Expert valorisateur",
    desc: "Pour estimer un bien avant son apport en nature au capital d’une société.",
    cercle: "miseEnOeuvre",
  },
  {
    title: "Sociétés de gestion",
    desc: "Gestion d’actifs et sélection de fonds pour vos placements financiers (OPCVM, PEA).",
    cercle: "sourcing",
  },
  {
    title: "Assureurs",
    desc: "Contrats d’assurance-vie, PER et solutions de prévoyance patrimoniale.",
    cercle: "sourcing",
  },
  {
    title: "Agents immobiliers",
    desc: "Sourcing d’opportunités locatives, commerciales et résidentielles.",
    cercle: "sourcing",
  },
  {
    title: "Private equity",
    desc: "Accès à des prises de participation dans des entreprises non cotées.",
    cercle: "sourcing",
  },
  {
    title: "Venture capital",
    desc: "Accès à des levées de fonds de startups marocaines et régionales sélectionnées.",
    cercle: "sourcing",
  },
];
