/**
 * Constantes partagées entre l'action serveur et le composant client.
 *
 * Hors de `actions.ts` volontairement : un module `"use server"` ne peut
 * exporter que des fonctions asynchrones. Un tableau exporté depuis là-bas
 * arrive côté client sous forme de référence serveur — d'où un
 * `.map is not a function` que ni TypeScript ni le build ne voient passer.
 */

/**
 * Le suivi commercial d'une demande, dans l'ordre de l'entonnoir.
 *
 * Depuis que le visiteur pose lui-même son créneau, une demande peut naître
 * directement en « planifie » : `book_slot` l'y met. « nouveau » ne signifie
 * donc plus « vient d'arriver » mais « personne ne s'en est occupé, et aucun
 * rendez-vous n'a été pris ».
 */
export const DEMANDE_STATUTS = [
  "nouveau",
  "contacte",
  "planifie",
  "honore",
  "annule",
] as const;

export type DemandeStatut = (typeof DEMANDE_STATUTS)[number];

interface StatutStyle {
  label: string;
  /** Aide à l'écran : ce que le statut veut dire, pas seulement son nom. */
  hint: string;
  /** Classes complètes — Tailwind ne compile pas un nom de classe assemblé. */
  pill: string;
  dot: string;
}

export const DEMANDE_STATUT_STYLES: Record<DemandeStatut, StatutStyle> = {
  nouveau: {
    label: "Nouveau",
    hint: "Personne ne s'en est encore occupé",
    pill: "bg-bronze/12 text-bronze-dark border-bronze/30",
    dot: "bg-bronze",
  },
  contacte: {
    label: "Contacté",
    hint: "Le prospect a été joint, sans créneau fixé",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  planifie: {
    label: "Rendez-vous fixé",
    hint: "Un créneau existe, posé par le visiteur ou le conseiller",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  honore: {
    label: "Honoré",
    hint: "Le rendez-vous a eu lieu",
    pill: "bg-ink/[0.06] text-ink border-ink/15",
    dot: "bg-ink",
  },
  annule: {
    label: "Sans suite",
    hint: "Annulé ou abandonné",
    pill: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
};
