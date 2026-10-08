"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Menu } from "lucide-react";
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
      <div className="px-6 pt-7 pb-8">
        <Link href="/" aria-label="Horkos Wealth Management, retour au site">
          <Image src="/images/logo.png" alt="Horkos Wealth Management" width={746} height={248} className="h-9 w-auto" />
        </Link>
      </div>

      <nav className="px-4 flex-1 space-y-1" aria-label="Sections de mon espace">
        {espaceSections.map((section) => {
          const active = isSectionActive(section.href, pathname);
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              // Referme le tiroir au clic plutôt que par un effet sur le chemin :
              // c'est le geste de l'utilisateur qui ferme, pas la navigation.
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 h-11 px-4 rounded-[6px] text-[15px] transition-colors ${
                active ? "bg-ink text-white" : "text-charcoal hover:bg-ink/[0.05] hover:text-ink"
              }`}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.6} aria-hidden="true" />
              {section.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-4 rounded-[20px] bg-cream-deep/60 p-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid place-items-center size-10 rounded-full bg-ink text-cream text-[14px] font-medium shrink-0"
          >
            {initials(profile.first_name, profile.last_name, profile.email)}
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-medium text-ink truncate">
              {shortName(profile.first_name, profile.last_name, profile.email)}
            </div>
            <div className="text-[13px] text-warm-grey">Client Horkos</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {/* Un membre de l'équipe peut consulter son espace client, mais doit
              pouvoir revenir au back-office sans réécrire l'URL. */}
          {(profile.role === "admin" || profile.role === "conseiller") && (
            <Link href="/admin" className="text-ink hover:underline">Back-office</Link>
          )}
          <Link href="/" className="text-warm-grey hover:text-ink transition-colors">Retour au site</Link>
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-1.5 text-warm-grey hover:text-red-700 transition-colors cursor-pointer">
              <LogOut className="size-3.5" aria-hidden="true" />
              Se déconnecter
            </button>
          </form>
        </div>
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
      <aside className="hidden lg:flex w-[272px] shrink-0 flex-col bg-white border-r border-ink/[0.08] sticky top-0 h-screen overflow-y-auto">
        {nav}
      </aside>

      {/* Barre mobile : le titre de section vit dans chaque page, on ne garde
          ici que de quoi ouvrir la navigation. */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center gap-3 h-14 px-4 bg-white border-b border-ink/10">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir la navigation"
          aria-expanded={open}
          className="grid place-items-center size-10 -ml-1 rounded-full text-ink hover:bg-ink/[0.05] transition-colors cursor-pointer"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <Image src="/images/logo.png" alt="Horkos Wealth Management" width={746} height={248} className="h-7 w-auto" />
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
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[288px] flex flex-col bg-white border-r border-ink/10 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0 bg-[color-mix(in_srgb,#EFE7D8_22%,white)]">{children}</main>
    </div>
  );
}
