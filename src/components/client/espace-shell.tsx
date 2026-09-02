"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { espaceSections, isSectionActive, initials, shortName } from "./espace-nav";
import { signOut } from "./actions";

export interface EspaceProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
}

/**
 * Barre latérale de l'espace client, tiroir coulissant sous `lg`.
 *
 * La maquette ne propose aucune version mobile. Un tiroir plutôt qu'une barre
 * d'onglets en bas : six entrées y tiendraient mal, et le tiroir accueillera
 * les sections à venir sans être repensé.
 */
export function EspaceShell({
  profile,
  children,
}: {
  profile: EspaceProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Le tiroir recouvre la page : la faire défiler dessous serait déroutant.
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

  const nav = (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-cream-deep">
        <span
          aria-hidden="true"
          className="grid place-items-center w-10 h-10 rounded-full bg-ink text-cream font-heading text-[14px] font-semibold shrink-0"
        >
          {initials(profile.first_name, profile.last_name, profile.email)}
        </span>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-ink truncate">
            {shortName(profile.first_name, profile.last_name, profile.email)}
          </div>
          <div className="text-[11.5px] text-warm-grey">Client Horkos</div>
        </div>
      </div>

      <nav className="p-3 flex-1" aria-label="Sections de mon espace">
        {espaceSections.map((section) => {
          const active = isSectionActive(section.href, pathname);
          return (
            <Link
              key={section.href}
              href={section.href}
              // Referme le tiroir au clic plutôt que par un effet sur le chemin :
              // c'est le geste de l'utilisateur qui ferme, pas la navigation.
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] transition-colors ${
                active
                  ? "bg-white text-ink font-medium shadow-sm"
                  : "text-charcoal hover:bg-white/60 hover:text-ink"
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                  active ? "bg-bronze" : "bg-cream-deep"
                }`}
              />
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-cream-deep">
        {/* Un membre de l'équipe peut consulter son espace client, mais doit
            pouvoir revenir au back-office sans réécrire l'URL. */}
        {(profile.role === "admin" || profile.role === "conseiller") && (
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 mb-1 text-[12.5px] font-medium text-ink hover:text-bronze transition-colors"
          >
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-bronze shrink-0" />
            Back-office
          </Link>
        )}
        <Link
          href="/"
          className="block px-3 py-2 text-[12.5px] text-warm-grey hover:text-bronze transition-colors"
        >
          ← Retour au site
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-3 py-2 text-[12.5px] text-warm-grey hover:text-red-700 transition-colors cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5M21 12H9" />
            </svg>
            Se déconnecter
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-white">
      {/* `sticky h-screen` : dans la rangée flex, la barre s'étirerait sinon à
          la hauteur de la page entière, et son pied - la déconnexion - ne se
          verrait qu'après avoir tout défilé. Bornée à l'écran, elle reste en
          place et son propre défilement prend le relais si la fenêtre est trop
          basse pour toutes les entrées. */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-cream border-r border-cream-deep sticky top-0 h-screen overflow-y-auto">
        {nav}
      </aside>

      {/* Barre mobile : le titre de section vit dans chaque page, on ne garde
          ici que de quoi ouvrir la navigation. */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-3 h-14 px-4 bg-white border-b border-cream-deep">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir la navigation"
          aria-expanded={open}
          className="grid place-items-center w-9 h-9 -ml-1 rounded-lg text-ink hover:bg-cream transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <span className="font-heading text-[16px] font-semibold text-ink tracking-[1.5px]">
          HORKOS
        </span>
      </header>

      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-40 bg-ink/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        // `inert` retire le tiroir fermé de la tabulation et du lecteur d'écran
        // sans l'ôter du flux, donc sans casser la transition de glissement.
        inert={!open}
        aria-label="Navigation de mon espace"
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-cream border-r border-cream-deep transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
