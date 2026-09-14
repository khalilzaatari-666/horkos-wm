import Link from "next/link";
import type { Sens } from "@/lib/liste";

/**
 * En-tête de colonne cliquable.
 *
 * Un lien et non un bouton : le tri est un état de la page, il doit s'écrire
 * dans l'URL, se copier et s'ouvrir dans un onglet. C'est aussi ce qui permet à
 * l'en-tête de vivre dans un composant serveur, sans une ligne de JavaScript.
 *
 * Le clic bascule le sens quand la colonne est déjà celle du tri, et repart en
 * croissant sinon - sauf pour les colonnes de date, où l'on veut presque
 * toujours voir le plus récent d'abord : `sensInitial` le dit.
 */
export function TriHeader({
  label,
  colonne,
  tri,
  sens,
  params,
  sensInitial = "asc",
  align = "left",
  cleTri = "tri",
  cleSens = "sens",
}: {
  label: string;
  /** Valeur écrite dans `?tri=` pour cette colonne. */
  colonne: string;
  /** Colonne actuellement triée. */
  tri: string;
  sens: Sens;
  /** Les autres paramètres de l'URL, à conserver en changeant de colonne. */
  params: Record<string, string | undefined>;
  sensInitial?: Sens;
  align?: "left" | "right";
  /**
   * Noms des paramètres d'URL. Deux tableaux cohabitent parfois sur une page -
   * le patrimoine montre les audits et les actifs - et trier l'un ne doit pas
   * réordonner l'autre : chacun prend alors son propre couple de clés.
   */
  cleTri?: string;
  cleSens?: string;
}) {
  const actif = tri === colonne;
  const suivant: Sens = actif ? (sens === "asc" ? "desc" : "asc") : sensInitial;

  const query = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur && cle !== cleTri && cle !== cleSens) query.set(cle, valeur);
  }
  query.set(cleTri, colonne);
  query.set(cleSens, suivant);

  return (
    <Link
      href={`?${query.toString()}`}
      scroll={false}
      className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${
        align === "right" ? "flex-row-reverse" : ""
      } ${actif ? "text-ink" : ""}`}
      aria-label={`Trier par ${label}, ordre ${suivant === "asc" ? "croissant" : "décroissant"}`}
    >
      {label}
      <span aria-hidden="true" className={actif ? "opacity-100" : "opacity-25"}>
        {actif && sens === "desc" ? "↓" : "↑"}
      </span>
    </Link>
  );
}
