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
 * `autre` ne sont plus créés (le client ne réserve que son R0), mais les
 * rendez-vous anciens de ces types gardent un nom lisible.
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

const actif = (status: string) => status === "planifie" || status === "confirme";

/** Plus d'un rendez-vous vivant pour une même étape : deux actifs, ou un actif après un tenu. */
function doublon(type: string, appointments: AppointmentLike[]): boolean {
  const duType = appointments.filter((a) => a.type === type);
  const actifs = duType.filter((a) => actif(a.status)).length;
  return actifs > 1 || (actifs === 1 && duType.some((a) => a.status === "termine"));
}

/**
 * L'état que `jalonSuivant` produit : chaque étape atteinte a sa précédente
 * franchie, et aucune n'est posée deux fois. Un R1 planifié sur un R0 annulé,
 * ou un R0 rétabli à côté d'un R0 tenu, ne l'est plus.
 */
export function parcoursCoherent(appointments: AppointmentLike[]): boolean {
  return PARCOURS.every(
    (e, i) =>
      !doublon(e.type, appointments) &&
      (i === 0 ||
        etatEtape(e.type, appointments) === "avenir" ||
        etatEtape(PARCOURS[i - 1].type, appointments) === "fait")
  );
}

/**
 * Pourquoi ce rendez-vous ne peut pas passer à `status`, ou `null` s'il le peut.
 *
 * Deux règles. On ne constate pas (terminé, non honoré) un rendez-vous qui n'a
 * pas encore eu lieu. Et on ne casse pas le parcours : annuler un R0 dont le R1
 * est posé, rétablir un doublon. Un dossier déjà incohérent (données
 * anciennes) échappe à la seconde : on ne l'empire pas, mais on laisse le
 * conseiller le remettre d'aplomb.
 *
 * L'onglet Suivi s'en sert pour griser la commande, l'action serveur pour la
 * refuser : la même phrase aux deux endroits.
 */
export function refusChangement(
  appointments: (AppointmentLike & { id: string; date: string })[],
  id: string,
  status: string,
  maintenant: Date
): string | null {
  const rdv = appointments.find((a) => a.id === id);
  if (!rdv) return "Ce rendez-vous n'appartient pas à ce client.";

  if (
    (status === "termine" || status === "non_honore") &&
    new Date(rdv.date).getTime() > maintenant.getTime()
  ) {
    return "Le rendez-vous n'a pas encore eu lieu.";
  }

  if (!parcoursCoherent(appointments)) return null;
  const apres = appointments.map((a) => (a.id === id ? { ...a, status } : a));
  if (parcoursCoherent(apres)) return null;

  return doublon(rdv.type, apres)
    ? `Un autre ${rdv.type} est déjà posé ou tenu.`
    : "L'étape suivante est déjà posée : annulez-la d'abord.";
}

/**
 * Ce que lit le client dont l'audit a déjà eu lieu. Il ne réserve que son R0 :
 * la suite se fixe avec le conseiller, depuis le suivi. La page de réservation
 * le dit, et l'action le répond à un formulaire resté ouvert.
 */
export const RESERVATION_FERMEE =
  "Votre audit patrimonial a eu lieu : votre conseiller vous contactera pour fixer la suite de votre parcours.";

export const R0_DEJA_PREVU =
  "Votre audit patrimonial est déjà réservé : retrouvez-le dans « Mon accompagnement ».";

/**
 * Le client peut-il réserver son R0 ? `null` s'il le peut, sinon la phrase à
 * lui montrer. Même lecture que `r0ARelancer` : un R0 tenu ferme la
 * réservation, un R0 encore à venir aussi ; un R0 annulé, manqué ou passé sans
 * avoir eu lieu la rouvre.
 */
export function refusReservation(
  r0s: { status: string; date: string }[],
  maintenant: Date
): string | null {
  if (r0s.some((r) => r.status === "termine")) return RESERVATION_FERMEE;
  const aVenir = r0s.some(
    (r) => actif(r.status) && new Date(r.date).getTime() > maintenant.getTime()
  );
  return aVenir ? R0_DEJA_PREVU : null;
}

/** L'étape où le client se trouve, ou la première non franchie. */
export function etapeCourante(appointments: AppointmentLike[]): (typeof PARCOURS)[number] | null {
  const encours = PARCOURS.find((e) => etatEtape(e.type, appointments) === "encours");
  if (encours) return encours;
  return PARCOURS.find((e) => etatEtape(e.type, appointments) === "avenir") ?? null;
}
