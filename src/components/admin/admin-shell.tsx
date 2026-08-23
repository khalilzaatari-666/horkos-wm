"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminSections, isAdminSectionActive } from "./admin-nav";
import { signOut } from "@/components/client/actions";

export interface AdminProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
}

/**
 * Coquille du back-office - barre latérale sombre, pour la distinguer d'un coup
 * d'œil de l'espace client. On ne veut pas qu'un conseiller croie parler à son
 * client parce que les deux interfaces se ressemblent.
 */
export function AdminShell({
  profile,
  children,
}: {
  profile: AdminProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const visible = adminSections.filter((s) => !s.adminOnly || profile.role === "admin");
  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email ||
    "Équipe";

  const nav = (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <span className="font-heading text-[17px] font-semibold text-white tracking-[2px] block">
          HORKOS
        </span>
        <span className="block text-[11px] text-white/50 mt-0.5 tracking-[1px] uppercase">
          Back-office
        </span>
      </div>

      <nav className="p-3 flex-1" aria-label="Sections du back-office">
        {visible.map((section) => {
          const active = isAdminSectionActive(section.href, pathname);
          return (
            <Link
              key={section.href}
              href={section.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] transition-colors ${
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                  active ? "bg-bronze-light" : "bg-white/20"
                }`}
              />
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="px-3 pb-2">
          <div className="text-[12.5px] text-white/80 truncate">{displayName}</div>
          <div className="text-[11px] text-white/40 capitalize">{profile.role}</div>
        </div>
        <Link
          href="/"
          className="block px-3 py-2 text-[12.5px] text-white/50 hover:text-white transition-colors"
        >
          ← Retour au site
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full text-left px-3 py-2 text-[12.5px] text-white/50 hover:text-red-300 transition-colors cursor-pointer"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-cream">
      {/* `sticky h-screen` : sans ça la barre s'étire à la hauteur de la page et
          son pied part sous la ligne de flottaison. */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-ink sticky top-0 h-screen overflow-y-auto">
        {nav}
      </aside>

      <header className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-3 h-14 px-4 bg-ink">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir la navigation"
          aria-expanded={open}
          className="grid place-items-center w-9 h-9 -ml-1 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <span className="font-heading text-[15px] font-semibold text-white tracking-[1.5px]">
          HORKOS
        </span>
      </header>

      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        inert={!open}
        aria-label="Navigation du back-office"
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-ink transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
