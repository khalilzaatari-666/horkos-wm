/**
 * Conversion d'une heure saisie « au cabinet » vers un instant absolu.
 *
 * La grille des rendez-vous est définie dans le fuseau du cabinet (voir
 * `components/booking/grille.ts`), et c'est cette heure-là que le conseiller
 * lit et saisit. Un décalage fixe serait faux : le Maroc revient à UTC+0 le
 * temps du Ramadan, donc le décalage se lit à la date visée, pas une fois pour
 * toutes.
 */

const TZ = "Africa/Casablanca";

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Décalage du fuseau du cabinet, en minutes, à cet instant précis. */
function offsetMinutes(instant: Date): number {
  const parts = PARTS.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return (asUtc - instant.getTime()) / 60_000;
}

/**
 * « 2026-09-15T10:00 » lu comme une heure de cabinet → instant ISO.
 *
 * Deux passes : la première suppose le décalage d'un instant voisin, la seconde
 * le relit sur l'instant trouvé. C'est ce qui rend le calcul juste de part et
 * d'autre d'un changement d'heure.
 *
 * Rend `null` sur une saisie qui n'est pas une date-heure valable.
 */
export function cabinetLocalToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;

  const naive = new Date(`${local}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;

  const first = new Date(naive.getTime() - offsetMinutes(naive) * 60_000);
  const second = new Date(naive.getTime() - offsetMinutes(first) * 60_000);
  return second.toISOString();
}
