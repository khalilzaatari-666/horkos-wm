import type { BesoinIconName } from "@/components/icons/besoin-icons";
import type { BesoinOption } from "@/lib/rdv-options";

export interface Besoin {
  icon: BesoinIconName;
  title: string;
  desc: string;
  /**
   * Illustration affichée en haut de la carte, ex. "/images/besoins/retraite.png".
   * Tant qu'elle est absente, la carte retombe sur l'icône dessinée à la main,
   * agrandie sur une plaque bronze - un rendu volontaire, pas un trou.
   */
  image?: string;
  /** Renseigné uniquement pour les besoins qui mènent à un formulaire dédié. */
  href?: string;
}

/**
 * Ces besoins-là doivent tous figurer dans la question 1 du questionnaire, à
 * l'identique : le titre est contraint sur `BesoinOption`, donc renommer une
 * carte sans renommer l'option ne compile pas. Les besoins entreprise plus bas
 * n'ont pas cette contrainte, ils ne sont pas proposés au questionnaire.
 */
export const besoinsParticuliers: (Besoin & { title: BesoinOption })[] = [
  {
    icon: "diversifier",
    image: "/images/besoins/diversifier.svg",
    title: "Diversifier mes investissements",
    desc: "Répartir un patrimoine trop concentré sur une seule classe d'actifs.",
  },
  {
    icon: "fiscalite",
    image: "/images/besoins/fiscalite.svg",
    title: "Optimiser ma fiscalité",
    desc: "Choisir les enveloppes et structures adaptées à votre situation.",
  },
  {
    icon: "retraite",
    image: "/images/besoins/retraite.svg",
    title: "Préparer ma retraite",
    desc: "Construire un capital ou un revenu complémentaire dans la durée.",
  },
  {
    icon: "transmettre",
    image: "/images/besoins/transmettre.svg",
    title: "Transmettre à mes enfants",
    desc: "Anticiper une succession ou une donation dans de bonnes conditions.",
  },
  {
    icon: "patrimoine",
    image: "/images/besoins/patrimoine.svg",
    title: "Structurer mon patrimoine",
    desc: "Organiser des actifs dispersés dans une logique cohérente.",
  },
  {
    icon: "societe",
    image: "/images/besoins/societe.svg",
    title: "Structurer une société patrimoniale",
    desc: "Créer ou réorganiser une société patrimoniale ou d'exploitation.",
  },
  {
    icon: "ceder",
    image: "/images/besoins/ceder.svg",
    title: "Céder un actif",
    desc: "Vendre un bien, des parts ou un portefeuille dans de bonnes conditions.",
    href: "/cabinet/produits#ceder",
  },
];

export const besoinsEntreprises: Besoin[] = [
  {
    icon: "collaborateurs",
    image: "/images/besoins/collaborateurs.svg",
    title: "Fidéliser mes collaborateurs",
    desc: "Mettre en place une épargne salariale (PER collectif) pour mon entreprise.",
  },
  {
    icon: "tresorerie",
    image: "/images/besoins/tresorerie.svg",
    title: "Investir ma trésorerie excédentaire",
    desc: "Faire fructifier ma trésorerie d'entreprise sans l'immobiliser.",
  },
];
