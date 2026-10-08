/** Arborescence du site public, partagée par l'en-tête et le pied de page. */
export interface NavLink {
  label: string;
  href: string;
  desc: string;
}

export interface NavGroup {
  label: string;
  links: NavLink[];
  /** Carte image du méga-menu : une entrée mise en avant dans la rubrique. */
  feature: { title: string; href: string; image: string };
}

export const NAV: NavGroup[] = [
  {
    label: "Le cabinet",
    links: [
      { label: "Notre approche", href: "/cabinet/approche", desc: "Comprendre avant de recommander, en trois temps." },
      { label: "Notre modèle", href: "/cabinet/modele", desc: "Comment nous sommes rémunérés, annoncé avant." },
      { label: "Nos produits", href: "/cabinet/produits", desc: "Les solutions mobilisées, une fois le besoin posé." },
    ],
    feature: { title: "Un premier échange, sans engagement", href: "/rendez-vous", image: "/images/menu/premier-echange.jpg" },
  },
  {
    label: "Le conseil",
    links: [
      { label: "Structuration patrimoniale", href: "/conseil/structuration", desc: "Sociétés patrimoniales, apports, gestion déléguée." },
      { label: "Notre réseau", href: "/conseil/reseau", desc: "Notaires, fiscalistes, banquiers : coordonnés pour vous." },
      { label: "Cas d'usage", href: "/conseil/cas-usage", desc: "Des situations réelles, et la manière de les traiter." },
    ],
    feature: { title: "Le réseau derrière chaque recommandation", href: "/conseil/reseau", image: "/images/menu/reseau.jpg" },
  },
  {
    label: "Ressources",
    links: [
      { label: "Articles", href: "/ressources/articles", desc: "Fiscalité, transmission, investissement au Maroc." },
      { label: "Guides", href: "/ressources/guides", desc: "À télécharger, pour préparer un rendez-vous." },
      { label: "Événements", href: "/ressources/evenements", desc: "Rencontres et conférences du cabinet." },
    ],
    feature: { title: "Nos guides à télécharger", href: "/ressources/guides", image: "/images/menu/guides.jpg" },
  },
];

export const LEGAL_LINKS = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Politique de confidentialité", href: "/politique-de-confidentialite" },
];
