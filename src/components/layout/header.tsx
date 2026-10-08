"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { NAV, LEGAL_LINKS } from "./nav";
import { CABINET_EMAIL, CABINET_PHONE, CABINET_PHONE_HREF } from "@/lib/site";

/**
 * En-tête du site public.
 *
 * En haut de page, une barre blanche pleine largeur. Dès qu'on défile, elle se
 * détache des bords et devient une pilule flottante, floutée, qui reste à
 * portée sans masquer le contenu. Chaque rubrique ouvre un méga-menu : les
 * liens avec leur raison d'être, et une carte image qui met une entrée en
 * avant.
 */
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  // Pastille de survol commune aux rubriques : elle glisse de l'une à l'autre
  // au lieu de s'éteindre et de se rallumer.
  const [pill, setPill] = useState({ x: 0, w: 0 });
  // Le panneau garde son dernier contenu pendant qu'il se referme, et le
  // contenu suivant arrive du côté de la rubrique survolée.
  const [prevOpen, setPrevOpen] = useState<string | null>(null);
  const [shownLabel, setShownLabel] = useState<string | null>(null);
  const [dir, setDir] = useState(0);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const at = (label: string) => NAV.findIndex((g) => g.label === label);
      setDir(prevOpen ? Math.sign(at(open) - at(prevOpen)) : 0);
      setShownLabel(open);
    }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Une navigation referme tout : le menu ne doit pas survivre au changement
  // de page. Réinitialisé pendant le rendu, comme le recommande React.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
    setMobileOpen(false);
    setMobileGroup(null);
  }

  // Échap referme le méga-menu ou la feuille mobile ; la page ne défile pas
  // derrière la feuille ouverte.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [mobileOpen]);

  const show = (label: string, trigger?: HTMLElement) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    if (trigger) setPill({ x: trigger.offsetLeft, w: trigger.offsetWidth });
    setOpen(label);
  };
  // Un court délai avant de refermer : le pointeur qui descend de l'intitulé
  // vers le panneau ne doit pas le faire disparaître en chemin.
  const hide = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(null), 140);
  };

  const group = NAV.find((g) => g.label === open);
  const shown = NAV.find((g) => g.label === shownLabel);
  const floating = scrolled && !mobileOpen;

  return (
    <header className="sticky top-0 z-50 h-[72px] lg:h-[84px]">
      <div
        ref={navRef}
        onMouseLeave={hide}
        className={`relative mx-auto transition-[max-width,margin,border-radius,background-color,box-shadow,padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          floating
            ? "mt-2.5 lg:mt-3 max-w-[calc(100%-20px)] lg:max-w-[1180px] rounded-[6px] bg-white/92 backdrop-blur-xl backdrop-saturate-150 shadow-[0_10px_30px_-12px_rgba(11,26,46,0.25)] ring-1 ring-ink/[0.06] px-2 lg:px-3"
            : "mt-0 max-w-full rounded-none bg-white px-0"
        }`}
      >
        <nav
          aria-label="Navigation principale"
          className={`flex items-center justify-between gap-6 transition-[height] duration-500 ${
            floating ? "h-[52px] lg:h-[60px] pl-3 lg:pl-4" : "shell h-[72px] lg:h-[84px]"
          }`}
        >
          <Link href="/" className="shrink-0" aria-label="Horkos Wealth Management, accueil">
            <Image
              src="/images/logo.png"
              alt="Horkos Wealth Management"
              width={746}
              height={248}
              priority
              className={`w-auto transition-[height] duration-500 ${floating ? "h-8" : "h-9 lg:h-11"}`}
            />
          </Link>

          <ul className="relative hidden lg:flex items-center gap-1">
            <span
              aria-hidden="true"
              className={`absolute left-0 top-1/2 h-10 -mt-5 rounded-[6px] bg-ink/[0.05] transition-[transform,width,opacity] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-opacity ${
                group ? "opacity-100" : "opacity-0"
              }`}
              style={{ width: pill.w, transform: `translateX(${pill.x}px)` }}
            />
            {NAV.map((g) => {
              const active = g.links.some((l) => pathname.startsWith(l.href));
              return (
                <li key={g.label} onMouseEnter={(e) => show(g.label, e.currentTarget)}>
                  <button
                    type="button"
                    aria-expanded={open === g.label}
                    aria-controls="mega-menu"
                    onClick={(e) => (open === g.label ? setOpen(null) : show(g.label, e.currentTarget.parentElement!))}
                    onFocus={(e) => show(g.label, e.currentTarget.parentElement!)}
                    className={`relative flex items-center gap-1.5 h-10 px-4 rounded-[6px] text-[15px] transition-colors duration-300 ${
                      open === g.label
                        ? "text-ink"
                        : active
                          ? "text-ink"
                          : "text-charcoal hover:text-ink"
                    }`}
                  >
                    {g.label}
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-3.5 opacity-60 transition-transform duration-300 ${open === g.label ? "rotate-180" : ""}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="hidden lg:flex items-center gap-2">
            {/* Vers /espace, pas /connexion : le proxy laisse passer une session
                active et renvoie sinon vers la connexion avec le retour prévu. */}
            <Link
              href="/espace"
              className="h-10 px-4 inline-flex items-center rounded-[6px] text-[15px] text-charcoal hover:text-ink transition-colors"
            >
              Espace client
            </Link>
            <Link href="/rendez-vous" className="btn btn-bronze btn-sm">
              Prendre rendez-vous
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="menu-mobile"
            className="lg:hidden inline-flex items-center gap-2 h-10 px-4 rounded-[6px] bg-ink text-white text-[14px] font-medium"
          >
            {mobileOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
            {mobileOpen ? "Fermer" : "Menu"}
          </button>
        </nav>

        {/* Méga-menu */}
        <div
          id="mega-menu"
          onMouseEnter={() => group && show(group.label)}
          inert={!group}
          className={`hidden lg:block absolute left-1/2 top-full pt-3 w-[min(720px,calc(100vw-40px))] origin-top transition-[opacity,translate,scale,filter] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-opacity ${
            group
              ? "opacity-100 -translate-x-1/2 translate-y-0 scale-100 blur-none duration-500"
              : "opacity-0 -translate-x-1/2 -translate-y-1.5 scale-[0.985] blur-[2px] pointer-events-none duration-200"
          }`}
        >
          {shown && (
            <div className="rounded-[16px] bg-white lift ring-1 ring-ink/[0.06] overflow-hidden">
              <div
                key={shown.label}
                className="mega-swap grid grid-cols-[1fr_220px] gap-2 p-2"
                style={{ "--mega-from": `${dir * 18}px` } as React.CSSProperties}
              >
                <ul className="grid grid-cols-1 p-1.5">
                  {shown.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="group flex items-start justify-between gap-4 rounded-[10px] px-3.5 py-3 hover:bg-cream-deep/50 transition-colors"
                      >
                        <span>
                          <span className="block text-[15px] font-medium leading-snug text-ink">{l.label}</span>
                          <span className="block text-[13px] leading-snug text-warm-grey mt-0.5">{l.desc}</span>
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 mt-1 shrink-0 text-ink opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={shown.feature.href}
                  className="group relative overflow-hidden rounded-[12px] min-h-[200px] bg-cream-deep"
                >
                  <Image
                    src={shown.feature.image}
                    alt=""
                    fill
                    sizes="220px"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
                  <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white">
                    <span className="font-heading text-[16px] leading-snug">{shown.feature.title}</span>
                    <span className="grid place-items-center size-7 shrink-0 rounded-full bg-white text-ink">
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feuille mobile */}
      <div
        id="menu-mobile"
        hidden={!mobileOpen}
        className="lg:hidden fixed inset-x-0 top-[72px] bottom-0 bg-white overflow-y-auto overscroll-contain"
        data-lenis-prevent
      >
        <div className="shell flex flex-col min-h-full pt-4 pb-8">
          {NAV.map((g) => {
            const expanded = mobileGroup === g.label;
            return (
              <div key={g.label} className="border-b border-ink/[0.08]">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setMobileGroup(expanded ? null : g.label)}
                  className="w-full flex items-center justify-between py-5 text-left"
                >
                  <span className="font-heading text-[30px] leading-none text-ink">{g.label}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-5 text-ink transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
                >
                  <ul className="overflow-hidden">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="block pb-4">
                          <span className="block text-[17px] font-medium text-ink">{l.label}</span>
                          <span className="block text-[14px] text-warm-grey">{l.desc}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}

          <div className="grid gap-3 mt-8">
            <Link href="/rendez-vous" className="btn btn-bronze w-full">
              Prendre rendez-vous
            </Link>
            <Link href="/espace" className="btn btn-outline w-full">
              Espace client
            </Link>
          </div>

          <div className="mt-auto pt-10 text-[14px] text-warm-grey space-y-1.5">
            <a href={CABINET_PHONE_HREF} className="block text-ink tabular-nums">{CABINET_PHONE}</a>
            <a href={`mailto:${CABINET_EMAIL}`} className="block text-ink">{CABINET_EMAIL}</a>
            <div className="flex flex-wrap gap-x-4 pt-4">
              <Link href="/contact">Nous contacter</Link>
              {LEGAL_LINKS.map((l) => (
                <Link key={l.href} href={l.href}>{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
