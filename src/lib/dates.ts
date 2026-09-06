/** Formats de date de l'espace client, en français. */

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** Exporté pour les vues qui composent leurs propres libellés (l'agenda). */
export const MOIS_COURTS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/**
 * `Intl` n'est pas utilisé ici : le rendu serveur et le navigateur peuvent
 * embarquer des données de locale différentes, ce qui provoque un écart
 * d'hydratation sur des chaînes de date. Une table figée rend le résultat
 * identique des deux côtés.
 */
export function formatDateLong(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "-";
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/** « 14 juil. » - pour les cartes où la place manque. */
export function formatDateShort(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "-";
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "-";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${formatDateLong(d)} à ${h}h${m}`;
}

/**
 * « à l'instant », « il y a 3 min », « il y a 2 h », « il y a 4 j », sinon la
 * date courte. `ref` (l'instant « maintenant ») est passé explicitement plutôt
 * que lu via `Date.now()` : le rendu reste pur et identique serveur/client.
 */
export function formatRelative(
  value: string | Date | null | undefined,
  ref: Date
): string {
  const d = toDate(value);
  if (!d) return "-";
  const sec = Math.round((ref.getTime() - d.getTime()) / 1000);
  if (sec < 45) return "à l'instant";
  const min = Math.round(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return formatDateShort(d);
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
