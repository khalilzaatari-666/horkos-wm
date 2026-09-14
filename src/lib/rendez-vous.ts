import { SITE_NAME } from "@/lib/site";

/**
 * Le nom et la durée d'un rendez-vous, en un seul endroit.
 *
 * Un même rendez-vous est nommé à quatre endroits qui ne se parlent pas :
 * l'agenda Google du cabinet, l'invitation ICS jointe aux emails, l'objet de
 * ces emails, et le back-office. Tant que chacun composait son propre intitulé,
 * le client lisait « Rendez-vous Horkos » dans sa boîte et « Horkos - rendez-vous
 * Untel » dans son agenda. Une seule fonction rend désormais le nom, et ces
 * quatre chemins l'appellent.
 *
 * La durée suit la même règle : elle dépend de l'étape et d'elle seule, et les
 * trois écritures qui posent un rendez-vous (la réservation en ligne, la pose
 * d'étape par le conseiller, la grille d'affichage) la lisent ici.
 */

/**
 * Ce qui suit le nom du cabinet dans l'intitulé.
 *
 * Le R2 n'en porte pas : à ce stade le client sait de quoi il s'agit, et
 * l'étape se suffit. La chaîne vide n'est pas un oubli, c'est la règle.
 */
const LIBELLES: Record<string, string> = {
  R0: "Audit patrimonial",
  R1: "Stratégie d'investissement",
  R2: "",
  revue: "Point de suivi",
  autre: "Échange",
};

/** Les trois étapes du parcours portent leur code devant le nom du cabinet. */
const ETAPES = new Set(["R0", "R1", "R2"]);

/**
 * Durées, en minutes. Elles ne sont pas décoratives : la réservation en ligne
 * s'en sert pour savoir si un créneau reste libre, et deux rendez-vous qui se
 * chevauchent d'une minute sont un double booking.
 */
export const DUREES: Record<string, number> = {
  R0: 45,
  R1: 90,
  R2: 60,
  revue: 60,
  autre: 60,
};

/** Repli sur une heure pour un type inconnu - une valeur écrite à la main. */
export const DUREE_DEFAUT = 60;

export function dureeRendezVous(type: string): number {
  return DUREES[type] ?? DUREE_DEFAUT;
}

/** « 45 » → « 45 minutes » ; « 90 » → « 1 h 30 ». */
export function libelleDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const heures = h === 1 ? "1 heure" : `${h} heures`;
  return m === 0 ? heures : `${h} h ${String(m).padStart(2, "0")}`;
}

/**
 * L'intitulé du rendez-vous.
 *
 *   R0 Horkos Wealth Management - Audit patrimonial - Amine Benali
 *   R1 Horkos Wealth Management - Stratégie d'investissement - Amine Benali
 *   R2 Horkos Wealth Management - Amine Benali
 *
 * Le nom du client est facultatif : le back-office l'affiche déjà dans sa
 * propre colonne, et le répéter dans la même ligne ne renseignerait personne.
 */
export function titreRendezVous(type: string, nom?: string | null): string {
  const prefixe = ETAPES.has(type) ? `${type} ${SITE_NAME}` : SITE_NAME;
  const libelle = LIBELLES[type];
  const parts = [prefixe, ...(libelle ? [libelle] : []), ...(nom?.trim() ? [nom.trim()] : [])];
  return parts.join(" - ");
}
