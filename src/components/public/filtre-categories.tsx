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
    `relative pb-3 text-[15px] transition-colors ${on ? "text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-ink" : "text-warm-grey hover:text-ink"}`;

  return (
    <nav
      aria-label="Filtrer par catégorie"
      className="flex flex-wrap gap-x-8 gap-y-2 border-b border-ink/10 mb-12"
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
