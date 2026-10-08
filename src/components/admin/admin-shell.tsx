"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { adminSections, isAdminSectionActive } from "./admin-nav";
import { signOut } from "@/components/client/actions";
import { AvatarUpload } from "./avatar-upload";
import { initials } from "@/components/client/espace-nav";

export interface AdminProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  avatar_url: string | null;
}

/**
 * Coquille du back-office - barre latérale sombre, pour la distinguer d'un coup
 * d'œil de l'espace client. On ne veut pas qu'un conseiller croie parler à son
 * client parce que les deux interfaces se ressemblent.
 */
export function AdminShell({
  profile,
  badges,
  children,
}: {
  profile: AdminProfile;
  /**
   * Nombre d'éléments en attente par entrée de menu, indexé par `href`. La
   * liste des sections reste une constante statique : c'est ici que les
   * chiffres arrivent, depuis le layout qui les a comptés.
   */
  badges?: Record<string, number>;
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
      <div className="flex items-center gap-3 px-6 pt-7 pb-8">
        {/* Seul le conseiller a une photo : c'est lui que le client voit sur son
            tableau de bord. Pour les autres rôles, la vignette n'aurait aucune
            destination - la place reste au titre. */}
        {profile.role === "conseiller" && (
          <AvatarUpload
            userId={profile.id}
            url={profile.avatar_url}
            initials={initials(profile.first_name, profile.last_name, profile.email)}
            size={40}
            compact
          />
        )}
        <div className="min-w-0">
          <Image src="/images/logo-light.png" alt="Horkos Wealth Management" width={746} height={248} className="h-8 w-auto" />
          <span className="mt-2 block text-[13px] text-white/50">Back-office</span>
        </div>
      </div>

      <nav className="px-4 flex-1 space-y-1" aria-label="Sections du back-office">
        {visible.map((section) => {
          const active = isAdminSectionActive(section.href, pathname);
          const enAttente = badges?.[section.href] ?? 0;
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 h-10 px-4 rounded-[6px] text-[14.5px] transition-colors ${
                active ? "bg-cream text-ink" : "text-white/65 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <Icon className="size-[17px] shrink-0" strokeWidth={1.6} aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate">{section.label}</span>
              {enAttente > 0 && (
                <span
                  aria-label={`${enAttente} non lue${enAttente > 1 ? "s" : ""}`}
                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11.5px] font-medium text-white bg-red-500 rounded-[6px] tabular-nums shrink-0"
                >
                  {enAttente}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="m-4 rounded-[20px] bg-white/[0.06] p-4">
        <div className="text-[14.5px] text-white truncate">{displayName}</div>
        <div className="text-[13px] text-white/50 capitalize">{profile.role}</div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          <Link href="/" className="text-white/60 hover:text-white transition-colors">
            Retour au site
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-white/60 hover:text-red-300 transition-colors cursor-pointer"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-cream-deep/40">
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
        <Image src="/images/logo-light.png" alt="Horkos Wealth Management" width={746} height={248} className="h-7 w-auto" />
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

      <main className="flex-1 min-w-0 pt-14 lg:pt-0 bg-[color-mix(in_srgb,#EFE7D8_22%,white)]">{children}</main>
    </div>
  );
}
