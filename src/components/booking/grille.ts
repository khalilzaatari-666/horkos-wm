/**
 * La grille horaire du cabinet — la même vérité que `get_slot_availability`
 * côté SQL (migration 010). Si l'une change, l'autre doit changer : le test de
 * `grille` verrouille la liste exacte des débuts pour qu'un écart se voie.
 *
 * Heures exprimées dans le fuseau du cabinet (Africa/Casablanca). Le serveur
 * calcule tout ; le navigateur ne fait qu'afficher des `timestamptz` formatés.
 */

/** Durée d'un rendez-vous, en minutes. Deux créneaux de 30 min consécutifs. */
export const DUREE_RDV_MIN = 60;

/** Minutes depuis minuit : ouverture, fermeture, déjeuner. */
export const OUVERTURE = 9 * 60; // 09:00
export const FERMETURE = 18 * 60; // 18:00
export const DEJEUNER_DEBUT = 12 * 60 + 30; // 12:30
export const DEJEUNER_FIN = 14 * 60; // 14:00

/** Marge minimale avant un rendez-vous, en minutes — pas de résa dans 10 min. */
export const MARGE_MIN = 120;

/** Combien de jours ouvrés proposés à la réservation (~6 semaines ouvrées). */
export const JOURS_PROPOSES = 30;

/**
 * Un début est valable si le rendez-vous complet tient dans une plage ouverte :
 * ni à cheval sur le déjeuner, ni au-delà de la fermeture.
 */
export function isBookableStart(minutes: number): boolean {
  const end = minutes + DUREE_RDV_MIN;
  const inMorning = minutes >= OUVERTURE && end <= DEJEUNER_DEBUT;
  const inAfternoon = minutes >= DEJEUNER_FIN && end <= FERMETURE;
  return inMorning || inAfternoon;
}

/** Les débuts possibles d'une journée ouvrée, en minutes depuis minuit. */
export function slotsOfDay(): number[] {
  const slots: number[] = [];
  for (let m = OUVERTURE; m + DUREE_RDV_MIN <= FERMETURE; m += 30) {
    if (isBookableStart(m)) slots.push(m);
  }
  return slots;
}

/** Samedi et dimanche fermés. `day` au sens `Date#getDay()` (0 = dimanche). */
export function isJourOuvre(day: number): boolean {
  return day >= 1 && day <= 5;
}

/** « 570 » → « 09:30 ». */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
