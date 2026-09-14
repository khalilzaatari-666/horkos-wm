/**
 * Tri et filtres des listes, côté serveur.
 *
 * Le back-office porte ses réglages dans l'URL et non dans un état local : une
 * vue devient alors partageable et survit au rechargement - « les guides encore
 * en brouillon, du plus récent au plus ancien » s'envoie par simple lien. C'est
 * déjà le parti pris de la page Rendez-vous ; ce module en extrait la mécanique
 * pour que toutes les listes l'appliquent de la même façon.
 *
 * Le tri est fait en mémoire, après la requête, jamais en enchaînant des
 * `.order()` sur un constructeur Supabase réassigné : cette réassignation
 * réinstancie les génériques du client à chaque maillon et a déjà fait dépasser
 * la limite mémoire du worker TypeScript au build (voir le commentaire de la
 * page Rendez-vous). Les listes du cabinet sont bornées par un `limit` ; trier
 * quelques centaines de lignes en JavaScript ne se mesure pas.
 */

export type Sens = "asc" | "desc";

/** Ce qu'une colonne peut rendre pour être comparée. */
export type Comparable = string | number | boolean | null | undefined;

/** Les paramètres d'URL tels que Next les remet à une page serveur. */
export type ParamsBruts = Record<string, string | string[] | undefined>;

/** La première valeur d'un paramètre, qu'il soit répété ou non. */
export function param(raw: ParamsBruts, cle: string): string | undefined {
  const valeur = raw[cle];
  return Array.isArray(valeur) ? valeur[0] : valeur;
}

/**
 * Ne retient qu'une valeur figurant dans la liste autorisée.
 *
 * Rien de ce qui vient de l'URL n'est cru sur parole : un `?statut=` trafiqué
 * doit retomber sur le défaut, pas traverser la page jusqu'à une requête.
 */
export function pick<T extends string>(
  valeur: string | undefined,
  autorisees: readonly T[],
  defaut: T | null
): T | null {
  return valeur && (autorisees as readonly string[]).includes(valeur) ? (valeur as T) : defaut;
}

/** Le sens de tri lu dans l'URL, `asc` sauf mention explicite du contraire. */
export function sensDe(valeur: string | undefined, defaut: Sens = "asc"): Sens {
  return valeur === "desc" ? "desc" : valeur === "asc" ? "asc" : defaut;
}

/**
 * Un terme de recherche libre, nettoyé.
 *
 * Les caractères qui ont un sens dans un filtre PostgREST (`,`, `()`, `%`, `*`,
 * `:`) sont neutralisés : le terme finit parfois interpolé dans un `.or(...)`,
 * et une virgule y ouvrirait une condition de plus.
 */
export function recherche(raw: ParamsBruts, cle = "q", max = 80): string {
  return (param(raw, cle) ?? "").replace(/[,()%*:]/g, " ").trim().slice(0, max);
}

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

/**
 * Compare deux valeurs de colonne. Les cases vides ferment la marche quel que
 * soit le sens : un tableau qui commence par une colonne de tirets ne renseigne
 * sur rien, et c'est vrai aussi bien en croissant qu'en décroissant.
 */
function comparer(a: Comparable, b: Comparable, sens: Sens): number {
  const videA = a === null || a === undefined || a === "";
  const videB = b === null || b === undefined || b === "";
  if (videA && videB) return 0;
  if (videA) return 1;
  if (videB) return -1;

  const signe = sens === "asc" ? 1 : -1;

  if (typeof a === "number" && typeof b === "number") return (a - b) * signe;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return (Number(a) - Number(b)) * signe;
  }
  return collator.compare(String(a), String(b)) * signe;
}

/**
 * Trie une copie de la liste. Une copie, parce que les lignes rendues viennent
 * souvent d'un tableau déjà utilisé ailleurs sur la page (un compteur, un
 * regroupement) que le tri d'affichage n'a pas à réordonner.
 *
 * `toSorted` n'est pas employé : le tri doit rester stable au sens de la
 * seconde clé qu'on lui passe parfois, et `sort` l'est depuis ES2019.
 */
export function trier<T>(
  rows: T[],
  cle: (row: T) => Comparable,
  sens: Sens,
  /** Départage les ex æquo - le nom quand deux montants sont égaux, par exemple. */
  secondaire?: (row: T) => Comparable
): T[] {
  return [...rows].sort((a, b) => {
    const principal = comparer(cle(a), cle(b), sens);
    if (principal !== 0 || !secondaire) return principal;
    return comparer(secondaire(a), secondaire(b), "asc");
  });
}

/** Une date ISO comparée comme un instant, et non comme du texte. */
export function instant(valeur: string | null | undefined): number | null {
  if (!valeur) return null;
  const t = new Date(valeur).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Le texte contient-il le terme cherché ?
 *
 * Accents et casse ignorés des deux côtés : « benali » doit trouver « Benali »
 * comme « Bénali ». Les conseillers tapent vite et sans accents.
 */
export function contient(champs: (string | null | undefined)[], terme: string): boolean {
  if (!terme) return true;
  const cible = normaliser(champs.filter(Boolean).join(" "));
  return normaliser(terme)
    .split(/\s+/)
    .filter(Boolean)
    .every((mot) => cible.includes(mot));
}

function normaliser(valeur: string): string {
  return valeur
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Garde-fou des listes du back-office. Les volumes du cabinet restent très en
 * deçà ; la borne évite seulement qu'une table qui grossit finisse par peser
 * sur chaque affichage. Si elle est atteinte un jour, c'est le signal d'ajouter
 * une pagination, pas de la relever.
 */
export const LIMITE_LISTE = 500;
