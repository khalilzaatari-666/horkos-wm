/**
 * Le parcours Horkos : R0 → R1 → R2.
 *
 * Partagé entre le tableau de bord, qui n'en montre qu'un résumé, et la page
 * « Mon accompagnement », qui le détaille. Deux copies finiraient par ne plus
 * s'accorder sur l'étape en cours, ce qu'un client remarquerait aussitôt.
 *
 * `revue` et `autre` ne font pas partie du parcours : ce sont des rendez-vous
 * de suivi, ils apparaissent dans les listes mais ne font franchir aucune étape.
 */

export interface AppointmentLike {
  type: string;
  status: string;
}

export const PARCOURS = [
  {
    type: "R0",
    title: "Audit patrimonial",
    desc: "Un premier échange pour comprendre votre situation : actifs, structure, objectifs. Gratuit et sans engagement.",
  },
  {
    type: "R1",
    title: "Stratégie",
    desc: "Nous vous présentons la structuration proposée et les solutions retenues, avec leurs coûts.",
  },
  {
    type: "R2",
    title: "Gouvernance",
    desc: "Une fois la stratégie mise en œuvre, nous restons impliqués : reporting périodique et arbitrages.",
  },
] as const;

export type EtapeState = "fait" | "encours" | "avenir";

/**
 * Franchie si un rendez-vous de ce type est terminé, en cours s'il est planifié
 * ou confirmé.
 *
 * Une étape dont la précédente n'est pas franchie reste simplement « à venir » :
 * on ne déduit pas l'avancement d'un ordre supposé, on lit ce qui existe.
 */
export function etatEtape(type: string, appointments: AppointmentLike[]): EtapeState {
  const forType = appointments.filter((a) => a.type === type);
  if (forType.some((a) => a.status === "termine")) return "fait";
  if (forType.some((a) => a.status === "planifie" || a.status === "confirme")) return "encours";
  return "avenir";
}

/**
 * Indice de l'étape la plus avancée atteinte, franchie ou en cours.
 * `-1` quand le parcours n'a pas commencé.
 *
 * C'est ce repère que la barre de progression remplit : on s'arrête au dernier
 * jalon réellement atteint, sans extrapoler sur celui d'après.
 */
export function progressionParcours(appointments: AppointmentLike[]): number {
  let reached = -1;
  PARCOURS.forEach((etape, i) => {
    if (etatEtape(etape.type, appointments) !== "avenir") reached = i;
  });
  return reached;
}

/** L'étape où le client se trouve, ou la première non franchie. */
export function etapeCourante(appointments: AppointmentLike[]): (typeof PARCOURS)[number] | null {
  const encours = PARCOURS.find((e) => etatEtape(e.type, appointments) === "encours");
  if (encours) return encours;
  return PARCOURS.find((e) => etatEtape(e.type, appointments) === "avenir") ?? null;
}
