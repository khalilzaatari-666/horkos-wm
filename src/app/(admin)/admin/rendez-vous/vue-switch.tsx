import Link from "next/link";

/** Les filtres qui ont un sens dans les deux vues, et qui les suivent donc. */
const PARTAGES = ["statut", "mode", "conseiller"] as const;

/**
 * Bascule Liste / Semaine.
 *
 * Deux pages plutôt qu'un paramètre de vue : la liste interroge une période
 * ouverte avec tri et plafond, la semaine deux bornes fermées sans l'un ni
 * l'autre. Les mélanger dans un seul composant ferait deux requêtes et deux
 * rendus dans un même fichier, pour rien.
 *
 * Ce qui reste commun, ce sont les filtres : les emporter d'une vue à l'autre
 * évite de les reposer à chaque bascule.
 */
export function VueSwitch({
  active,
  params,
}: {
  active: "liste" | "semaine";
  params: Record<string, string | undefined>;
}) {
  const query = new URLSearchParams();
  for (const cle of PARTAGES) {
    const valeur = params[cle];
    if (valeur) query.set(cle, valeur);
  }
  const suffixe = query.toString() ? `?${query.toString()}` : "";

  const vues = [
    { cle: "liste" as const, label: "Liste", href: `/admin/rendez-vous${suffixe}` },
    { cle: "semaine" as const, label: "Semaine", href: `/admin/rendez-vous/semaine${suffixe}` },
  ];

  return (
    <div
      role="group"
      aria-label="Affichage des rendez-vous"
      className="inline-flex items-center p-0.5 bg-white border border-cream-deep rounded-lg"
    >
      {vues.map((v) => (
        <Link
          key={v.cle}
          href={v.href}
          aria-current={active === v.cle ? "page" : undefined}
          className={`px-3 py-1.5 text-[12.5px] font-medium rounded-md transition-colors ${
            active === v.cle
              ? "bg-ink text-cream"
              : "text-warm-grey hover:text-ink hover:bg-cream/60"
          }`}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
