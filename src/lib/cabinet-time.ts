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

/** Les composantes d'un instant, lues dans le fuseau du cabinet. */
export interface PartsCabinet {
  annee: number;
  /** 1-12, pas l'index de `Date#getMonth`. */
  mois: number;
  jour: number;
  /** Minutes depuis minuit, comme la grille de `components/booking/grille.ts`. */
  minutes: number;
}

/**
 * L'inverse de `cabinetLocalToIso` : un instant absolu → l'heure que le cabinet
 * lit à sa pendule.
 *
 * C'est ce qui place un rendez-vous dans la bonne colonne et à la bonne hauteur
 * du calendrier. Le faire avec `getDay()` / `getHours()` lirait le fuseau du
 * serveur - Vercel est en UTC - et décalerait tout d'une heure une partie de
 * l'année.
 */
export function partsCabinet(instant: Date): PartsCabinet {
  const parts = PARTS.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    annee: get("year"),
    mois: get("month"),
    jour: get("day"),
    minutes: get("hour") * 60 + get("minute"),
  };
}

const REGEX_JOUR = /^\d{4}-\d{2}-\d{2}$/;

function deuxChiffres(n: number): string {
  return String(n).padStart(2, "0");
}

/** Le jour civil d'un `Date` lu en UTC - « 2026-09-07 ». */
function jourUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${deuxChiffres(d.getUTCMonth() + 1)}-${deuxChiffres(d.getUTCDate())}`;
}

/** Le jour civil du cabinet à cet instant - « 2026-09-07 ». */
export function jourCabinet(instant: Date): string {
  const p = partsCabinet(instant);
  return `${p.annee}-${deuxChiffres(p.mois)}-${deuxChiffres(p.jour)}`;
}

/**
 * Le lundi de la semaine contenant ce jour civil, ou `null` si la date n'existe
 * pas au calendrier.
 *
 * L'arithmétique se fait en UTC sur une date nue : aucun changement d'heure ne
 * peut faire dériver l'addition, alors qu'un `setDate` en heure locale le
 * pourrait.
 */
export function lundiDeLaSemaine(jour: string): string | null {
  if (!REGEX_JOUR.test(jour)) return null;
  const t = Date.parse(`${jour}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  // `Date.parse` reporte « 2026-02-31 » sur mars au lieu de refuser : on relit
  // la date obtenue pour écarter une saisie qui n'existe pas.
  if (jourUtc(new Date(t)) !== jour) return null;
  const recul = (new Date(t).getUTCDay() + 6) % 7; // lundi = 0
  return jourUtc(new Date(t - recul * 86_400_000));
}

/**
 * Le lundi de la semaine que l'agenda doit ouvrir pour ce jour.
 *
 * Comme `lundiDeLaSemaine`, sauf le dimanche : le cabinet est fermé, et ce
 * qu'un conseiller veut voir ce jour-là est la semaine qui s'ouvre, pas celle
 * qui s'achève. La semaine écoulée reste à une flèche de distance.
 */
export function lundiCourant(jour: string): string | null {
  const lundi = lundiDeLaSemaine(jour);
  if (!lundi) return null;
  return rangDansLaSemaine(lundi, jour) === 6 ? ajouterJours(lundi, 7) : lundi;
}

/** Décale un jour civil de `n` jours. */
export function ajouterJours(jour: string, n: number): string {
  return jourUtc(new Date(Date.parse(`${jour}T00:00:00Z`) + n * 86_400_000));
}

/** Rang d'un jour dans la semaine ouverte par `lundi` - 0 = lundi, 6 = dimanche. */
export function rangDansLaSemaine(lundi: string, jour: string): number {
  const ecart = Date.parse(`${jour}T00:00:00Z`) - Date.parse(`${lundi}T00:00:00Z`);
  return Math.round(ecart / 86_400_000);
}

/**
 * Les deux bornes absolues d'une semaine de cabinet, prêtes pour un `gte`/`lt`.
 *
 * Chaque borne est convertie séparément : si le décalage change au milieu de la
 * semaine, la semaine ne dure pas exactement 168 heures, et ajouter sept jours
 * au premier instant raterait un rendez-vous du lundi suivant.
 */
export function bornesSemaine(lundi: string): { debut: string; fin: string } | null {
  const debut = cabinetLocalToIso(`${lundi}T00:00`);
  const fin = cabinetLocalToIso(`${ajouterJours(lundi, 7)}T00:00`);
  return debut && fin ? { debut, fin } : null;
}
