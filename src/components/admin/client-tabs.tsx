"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Onglets du dossier client. L'onglet actif est déduit du chemin courant. */
export function ClientTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/admin/clients/${id}`;

  const tabs = [
    { href: base, label: "Vue d'ensemble" },
    { href: `${base}/patrimoine`, label: "Patrimoine" },
    { href: `${base}/audits`, label: "Audits" },
    { href: `${base}/documents`, label: "Documents" },
    { href: `${base}/recommandations`, label: "Recommandations" },
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
