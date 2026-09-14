/**
 * Regroupement des recommandations par catégorie, partagé par les trois listes
 * qui les affichent : le catalogue, le dossier client au back-office, et
 * l'espace client.
 *
 * Le classement suit celui du coffre-fort : une section par rubrique, un titre,
 * puis les pièces. À la différence des documents en revanche, la catégorie d'une
 * recommandation est un texte libre saisi par le cabinet - il n'y a donc pas de
 * liste de référence à respecter, seulement les catégories réellement employées.
 *
 * L'ordre est alphabétique au sens du français (« Épargne » se range à sa place,
 * ce qu'un tri brut sur les codes de caractères ne ferait pas), et le fourre-tout
 * des recommandations sans catégorie ferme toujours la marche.
 */

/** Ce qu'affiche le titre de section quand la catégorie n'a pas été renseignée. */
export const SANS_CATEGORIE = "Sans catégorie";

const collator = new Intl.Collator("fr", { sensitivity: "base" });

export interface GroupeCategorie<T> {
  /** Sert de clé de rendu autant que de titre. */
  categorie: string;
  rows: T[];
}

export function grouperParCategorie<T>(
  rows: T[],
  categorieDe: (row: T) => string | null | undefined
): GroupeCategorie<T>[] {
  const groupes = new Map<string, T[]>();

  for (const row of rows) {
    // Deux saisies qui ne diffèrent que par la casse ou les espaces désignent la
    // même catégorie : les séparer donnerait deux sections quasi identiques.
    const brut = (categorieDe(row) ?? "").trim();
    const cle = brut || SANS_CATEGORIE;
    const existant = [...groupes.keys()].find((k) => collator.compare(k, cle) === 0);
    const groupe = groupes.get(existant ?? cle);
    if (groupe) groupe.push(row);
    else groupes.set(cle, [row]);
  }

  return [...groupes.entries()]
    .map(([categorie, rows]) => ({ categorie, rows }))
    .sort((a, b) => {
      if (a.categorie === SANS_CATEGORIE) return 1;
      if (b.categorie === SANS_CATEGORIE) return -1;
      return collator.compare(a.categorie, b.categorie);
    });
}
