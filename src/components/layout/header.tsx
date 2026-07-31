"use client";

import Link from "next/link";
import Image from "next/image";
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
    label: "Le conseil",
    children: [
      { label: "Notre structuration patrimoniale", href: "/conseil/structuration" },
      { label: "Notre réseau de professionnels", href: "/conseil/reseau" },
      { label: "Nos cas d’usage", href: "/conseil/cas-usage" },
    ],
  },
  {
    label: "Les ressources",
    children: [
      { label: "Nos articles", href: "/ressources/articles" },
      { label: "Nos guides", href: "/ressources/guides" },
      { label: "Nos événements", href: "/ressources/evenements" },
    ],
  },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-cream-deep">
      <nav className="flex items-center justify-between px-7 py-4 max-w-[1200px] mx-auto">
        <Link href="/">
          <Image
            src="/images/logo.png"
            alt="Horkos Wealth Management"
            width={140}
            height={50}
            className="h-14 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden lg:flex items-center gap-1 list-none">
          {navItems.map((item) => (
            <li
              key={item.label}
              className="relative"
              onMouseEnter={() => setOpenDropdown(item.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <span className="flex items-center gap-[5px] px-3.5 py-2.5 text-[13.5px] font-medium text-charcoal cursor-pointer rounded-[3px] hover:bg-cream hover:text-ink transition-colors">
                {item.label} <span className="text-[11px]">▾</span>
              </span>
              <div className={`absolute top-full left-0 bg-white border border-cream-deep min-w-[260px] shadow-[0_12px_28px_rgba(11,26,46,0.08)] p-2 z-60 rounded-lg transition-all duration-200 ease-out origin-top ${openDropdown === item.label ? "opacity-100 scale-y-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-y-95 -translate-y-1 pointer-events-none"}`}>
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="block px-3 py-[11px] text-[13px] rounded-md text-charcoal hover:bg-cream transition-colors"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>

        {/* CTA group */}
        <div className="hidden lg:flex items-center gap-2.5">
          <Link
            href="/connexion"
            className="inline-block px-[26px] py-[13px] text-[13.5px] font-medium tracking-[0.2px] text-ink border border-ink bg-transparent hover:bg-ink hover:text-cream transition-colors"
          >
            Espace client
          </Link>
          <Link
            href="/questionnaire"
            className="inline-block px-[26px] py-[13px] text-[13.5px] font-medium tracking-[0.2px] bg-ink text-cream hover:bg-ink/90 transition-colors"
          >
            Prendre rendez‑vous
          </Link>
        </div>

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
      </nav>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-cream-deep bg-white px-7 py-4 space-y-4">
          {navItems.map((item) => (
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
          ))}
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/connexion"
              className="text-center px-[26px] py-[13px] text-[13.5px] font-medium text-ink border border-ink"
              onClick={() => setMobileOpen(false)}
            >
              Espace client
            </Link>
            <Link
              href="/questionnaire"
              className="text-center px-[26px] py-[13px] text-[13.5px] font-medium bg-ink text-cream"
              onClick={() => setMobileOpen(false)}
            >
              Prendre rendez‑vous
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
