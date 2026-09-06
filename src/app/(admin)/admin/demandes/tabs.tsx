"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface OngletDemandes {
  href: string;
  label: string;
  /** Demandes que personne n'a encore ouvertes. 0 = pas de pastille. */
  nonLues: number;
}

/**
 * Onglets de la section Demandes, avec le nombre de non-lus par onglet.
 *
 * Le compte est calculé par le layout, pas ici : les deux onglets le veulent, et
 * une seule requête par table vaut mieux que deux pages qui comptent chacune
 * pour elle.
 */
export function DemandesTabs({ onglets }: { onglets: OngletDemandes[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-cream-deep mb-6"
      aria-label="Sections des demandes"
    >
      {onglets.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium -mb-px border-b-2 transition-colors ${
              active
                ? "border-bronze text-ink"
                : "border-transparent text-warm-grey hover:text-ink"
            }`}
          >
            {t.label}
            {t.nonLues > 0 && (
              <span
                // Le nombre est lu par les lecteurs d'écran ; la pastille seule
                // ne dirait rien à qui ne la voit pas.
                aria-label={`${t.nonLues} non lue${t.nonLues > 1 ? "s" : ""}`}
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10.5px] font-semibold text-white bg-red-500 rounded-full tabular-nums"
              >
                {t.nonLues}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
