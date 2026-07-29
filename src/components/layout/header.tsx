"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  {
    label: "Le cabinet",
    children: [
      { label: "Notre approche", href: "/cabinet/approche" },
      { label: "Notre modèle", href: "/cabinet/modele" },
      { label: "Nos produits", href: "/cabinet/produits" },
    ],
  },
  {
    label: "Conseil",
    children: [
      { label: "Structuration patrimoniale", href: "/conseil/structuration" },
      { label: "Réseau de professionnels", href: "/conseil/reseau" },
      { label: "Cas d&apos;usage", href: "/conseil/cas-usage" },
    ],
  },
  {
    label: "Ressources",
    children: [
      { label: "Articles", href: "/ressources/articles" },
      { label: "Guides", href: "/ressources/guides" },
      { label: "Événements", href: "/ressources/evenements" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-cream-deep">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <Link href="/" className="font-heading text-2xl font-semibold text-ink tracking-[3px]">
          HORKOS
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) =>
            item.children ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button className="text-sm font-medium text-charcoal hover:text-bronze transition-colors">
                  {item.label}
                </button>
                {openDropdown === item.label && (
                  <div className="absolute top-full left-0 pt-2">
                    <div className="bg-white border border-cream-deep rounded-md shadow-lg py-2 min-w-[220px]">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block px-4 py-2 text-sm text-charcoal hover:bg-cream hover:text-bronze transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.label}
                href={item.href!}
                className="text-sm font-medium text-charcoal hover:text-bronze transition-colors"
              >
                {item.label}
              </Link>
            )
          )}
          <Link
            href="/connexion"
            className="text-sm font-medium text-charcoal hover:text-bronze transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/questionnaire"
            className="bg-bronze text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-bronze-dark transition-colors"
          >
            Prendre rendez‑vous
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-ink"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-cream-deep bg-white px-6 py-4 space-y-4">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label} className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-warm-grey">
                  {item.label}
                </span>
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="block pl-3 py-1.5 text-sm text-charcoal hover:text-bronze"
                    onClick={() => setMobileOpen(false)}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={item.label}
                href={item.href!}
                className="block py-1.5 text-sm font-medium text-charcoal hover:text-bronze"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            )
          )}
          <Link
            href="/questionnaire"
            className="block text-center bg-bronze text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-bronze-dark"
            onClick={() => setMobileOpen(false)}
          >
            Prendre rendez‑vous
          </Link>
        </div>
      )}
    </header>
  );
}
