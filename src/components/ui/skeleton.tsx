/**
 * Bloc d'attente. Les `loading.tsx` des espaces l'assemblent en un gabarit qui
 * ressemble à la page à venir (titre, cartes, lignes) plutôt qu'un spinner :
 * l'œil sait où regarder quand le contenu arrive, et rien ne saute.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-cream-deep/70 ${className}`} />;
}

/** Un titre de page et son sous-titre, tels que les en-têtes des deux espaces. */
export function SkeletonHead() {
  return (
    <div className="mb-7 space-y-3">
      <Skeleton className="h-7 w-64 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

/** Une carte blanche avec quelques lignes de texte. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white border border-cream-deep rounded-xl shadow-sm p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? "w-1/2" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Une liste ou un tableau : une en-tête puis des lignes pleine largeur. */
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white border border-cream-deep rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-cream-deep">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="divide-y divide-cream-deep">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/6 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
