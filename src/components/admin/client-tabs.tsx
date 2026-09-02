"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Onglets du dossier client. L'onglet actif est déduit du chemin courant. */
export function ClientTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/admin/clients/${id}`;

  const tabs = [
    // L'ordre suit la vie du dossier : on découvre, on audite le patrimoine, on
    // recommande, on suit - les pièces jointes fermant la marche.
    { href: base, label: "Vue d'ensemble" },
    { href: `${base}/patrimoine`, label: "Audits" },
    { href: `${base}/recommandations`, label: "Recommandations" },
    { href: `${base}/suivi`, label: "Suivi" },
    { href: `${base}/documents`, label: "Documents" },
  ];

  return (
    <nav className="flex flex-wrap gap-1 border-b border-cream-deep mb-6" aria-label="Sections du dossier">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`px-3.5 py-2.5 text-[13px] font-medium -mb-px border-b-2 transition-colors ${
              active
                ? "border-bronze text-ink"
                : "border-transparent text-warm-grey hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
