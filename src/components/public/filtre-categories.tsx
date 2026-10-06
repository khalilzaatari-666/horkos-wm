import Link from "next/link";

/**
 * Les filtres par catégorie des pages Ressources : « Tout » puis les
 * catégories qui ont au moins un contenu publié sur la page, dans l'ordre
 * choisi au back-office. De simples liens : la page filtre côté serveur.
 */
export function FiltreCategories({
  base,
  categories,
  active,
}: {
  base: string;
  categories: string[];
  active: string | null;
}) {
  if (categories.length === 0) return null;

  const pastille = (on: boolean) =>
    `inline-flex items-center h-9 px-4 rounded-full border text-[13px] font-medium transition-colors ${
      on
        ? "bg-ink border-ink text-cream"
        : "bg-white border-cream-deep text-charcoal hover:border-bronze hover:text-ink"
    }`;

  return (
    <nav
      aria-label="Filtrer par catégorie"
      className="flex flex-wrap gap-2 mb-8"
    >
      <Link
        href={base}
        aria-current={active === null ? "page" : undefined}
        className={pastille(active === null)}
      >
        Tout
      </Link>
      {categories.map((c) => (
        <Link
          key={c}
          href={`${base}?categorie=${encodeURIComponent(c)}`}
          aria-current={active === c ? "page" : undefined}
          className={pastille(active === c)}
        >
          {c}
        </Link>
      ))}
    </nav>
  );
}
