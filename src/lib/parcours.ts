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
    desc: "Nous vous présentons la structuration proposée et les solutions retenues, en détaillant les frais.",
  },
  {
    type: "R2",
    title: "Gouvernance",
    desc: "Une fois la stratégie mise en œuvre, nous restons impliqués : reporting périodique et arbitrages.",
  },
] as const;

export type EtapeState = "fait" | "encours" | "avenir";

/** Un rendez-vous de ce type fait-il franchir une étape du parcours ? */
export function estJalonParcours(type: string): boolean {
  return PARCOURS.some((e) => e.type === type);
}

/**
 * Ce que le client lit à la place du code interne.
 *
 * Les trois jalons reprennent le titre du parcours plutôt qu'une copie, sinon
 * la carte et la barre finiraient par ne plus dire la même chose. `revue` et
 * `autre` n'y figurent pas : depuis que le client réserve lui-même, tout
 * rendez-vous pris après l'audit est une revue, et il en verra passer plus
 * d'un.
 */
export function libelleType(type: string): string {
  const jalon = PARCOURS.find((e) => e.type === type);
  if (jalon) return jalon.title;
  if (type === "revue") return "Point de suivi";
  if (type === "autre") return "Échange";
  return type;
}

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

/**
 * L'étape que le conseiller peut poser maintenant, ou `null` s'il n'y a rien à
 * poser.
 *
 * Deux refus distincts, tous deux volontaires : une étape déjà planifiée n'a
 * pas à être doublée, et une étape dont la précédente n'est pas franchie ne se
 * saute pas - on ne convoque pas un R2 tant que le R1 n'a pas eu lieu.
 */
export function jalonSuivant(
  appointments: AppointmentLike[]
): (typeof PARCOURS)[number] | null {
  for (let i = 0; i < PARCOURS.length; i++) {
    const etat = etatEtape(PARCOURS[i].type, appointments);
    if (etat === "fait") continue;
    if (etat === "encours") return null;
    if (i === 0) return PARCOURS[i];
    return etatEtape(PARCOURS[i - 1].type, appointments) === "fait" ? PARCOURS[i] : null;
  }
  return null;
}

/** L'étape où le client se trouve, ou la première non franchie. */
export function etapeCourante(appointments: AppointmentLike[]): (typeof PARCOURS)[number] | null {
  const encours = PARCOURS.find((e) => etatEtape(e.type, appointments) === "encours");
  if (encours) return encours;
  return PARCOURS.find((e) => etatEtape(e.type, appointments) === "avenir") ?? null;
}
