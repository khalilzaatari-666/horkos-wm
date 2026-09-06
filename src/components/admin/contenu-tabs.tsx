"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Onglets de la section Contenu. L'onglet actif est déduit du chemin courant,
 * comme pour le dossier client.
 *
 * Les quatre pages restent à leur URL d'origine : seul l'habillage change, donc
 * aucun lien déjà envoyé ou mis en favori ne casse.
 */
const ONGLETS = [
  { href: "/admin/contenu/articles", label: "Articles" },
  { href: "/admin/contenu/guides", label: "Guides" },
  { href: "/admin/contenu/evenements", label: "Événements" },
  { href: "/admin/contenu/faqs", label: "FAQ" },
];

export function ContenuTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-cream-deep mb-6"
      aria-label="Sections du contenu"
    >
      {ONGLETS.map((t) => {
        const active = pathname.startsWith(t.href);
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
