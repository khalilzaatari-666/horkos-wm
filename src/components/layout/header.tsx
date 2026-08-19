"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";

gsap.registerPlugin(Observer);

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
      { label: "Nos cas d'usage", href: "/conseil/cas-usage" },
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
  const [mobileDropdown, setMobileDropdown] = useState<string | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const navBarRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const mobileItemsRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const isHiddenRef = useRef(false);

  /** Fills the viewport below the bar. `innerHeight` tracks mobile browser chrome. */
  const panelHeight = () =>
    window.innerHeight - (navBarRef.current?.getBoundingClientRect().height ?? 0);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = Observer.create({
      type: "scroll",
      onUp: () => {
        if (isHiddenRef.current) {
          isHiddenRef.current = false;
          gsap.to(header, {
            y: 0,
            duration: 0.3,
            ease: "power2.out",
          });
        }
      },
      onDown: () => {
        if (!isHiddenRef.current && window.scrollY > 80 && !mobileOpen) {
          isHiddenRef.current = true;
          gsap.to(header, {
            y: "-100%",
            duration: 0.3,
            ease: "power2.in",
          });
        }
      },
      tolerance: 10,
    });

    return () => observer.kill();
  }, [mobileOpen]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const handleScroll = () => {
      if (window.scrollY > 80) {
        header.classList.add("header-scrolled");
      } else {
        header.classList.remove("header-scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openMenu = useCallback(() => {
    setMobileOpen(true);

    requestAnimationFrame(() => {
      const nav = mobileNavRef.current;
      const items = mobileItemsRef.current;
      if (!nav || !items) return;

      if (tlRef.current) tlRef.current.kill();

      const parentButtons = items.querySelectorAll("[data-mobile-parent]");
      const ctaBlock = items.querySelector("[data-mobile-ctas]");
      const footerBlock = items.querySelector("[data-mobile-footer]");

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.fromTo(nav, { height: 0, opacity: 0 }, { height: panelHeight(), opacity: 1, duration: 0.35 });

      tl.fromTo(
        parentButtons,
        { opacity: 0, x: 24 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.08 },
        "-=0.15"
      );

      if (ctaBlock) {
        tl.fromTo(
          ctaBlock,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.3 },
          "-=0.1"
        );
      }

      if (footerBlock) {
        tl.fromTo(
          footerBlock,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.3 },
          "-=0.18"
        );
      }

      tlRef.current = tl;
    });
  }, []);

  const closeMenu = useCallback(() => {
    const nav = mobileNavRef.current;
    if (!nav) {
      setMobileOpen(false);
      setMobileDropdown(null);
      return;
    }

    if (tlRef.current) tlRef.current.kill();

    gsap.to(nav, {
      height: 0,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        setMobileOpen(false);
        setMobileDropdown(null);
      },
    });
  }, []);

  const toggleMobileDropdown = useCallback((label: string) => {
    setMobileDropdown((prev) => {
      const next = prev === label ? null : label;

      requestAnimationFrame(() => {
        const container = document.querySelector(`[data-mobile-children="${label}"]`);
        if (!container) return;

        if (next === label) {
          const links = container.querySelectorAll("a");
          gsap.fromTo(
            links,
            { opacity: 0, x: -16 },
            { opacity: 1, x: 0, duration: 0.25, stagger: 0.05, ease: "power2.out" }
          );
        }
      });

      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (tlRef.current) tlRef.current.kill();
    };
  }, []);

  // Keep the open panel full-height across rotation / browser-chrome collapse.
  useEffect(() => {
    if (!mobileOpen) return;

    const resize = () => {
      const nav = mobileNavRef.current;
      // Skip while the open timeline is still running so we don't fight it.
      if (nav && !tlRef.current?.isActive()) gsap.set(nav, { height: panelHeight() });
    };

    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, [mobileOpen]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 bg-white border-b border-cream-deep transition-[background-color,backdrop-filter,border-color] duration-300 lg:[&.header-scrolled]:bg-white/55 lg:[&.header-scrolled]:backdrop-blur-[16px] lg:[&.header-scrolled]:border-cream-deep/40"
    >
      <nav
        ref={navBarRef}
        className="relative flex items-center justify-center lg:justify-between px-7 py-4 max-w-[1200px] mx-auto"
      >
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
          {/* Vers /espace, pas /connexion : le proxy laisse passer une session
              active et renvoie sinon vers la connexion avec le retour prévu.
              Un lien codé sur /connexion ramenait au login des clients déjà
              connectés. */}
          <Link
            href="/espace"
            className="inline-block px-[26px] py-[13px] text-[13.5px] font-medium tracking-[0.2px] text-ink border border-ink bg-transparent hover:bg-ink hover:text-cream transition-colors"
          >
            Espace client
          </Link>
          <Link
            href="/rendez-vous"
            className="inline-block px-[26px] py-[13px] text-[13.5px] font-medium tracking-[0.2px] bg-ink text-cream hover:bg-ink/90 transition-colors"
          >
            Prendre rendez‑vous
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-ink absolute right-7 top-1/2 -translate-y-1/2"
          onClick={() => (mobileOpen ? closeMenu() : openMenu())}
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
        <div
          ref={mobileNavRef}
          className="lg:hidden overflow-y-auto overscroll-contain border-t border-cream-deep bg-white"
          style={{ height: 0, opacity: 0 }}
        >
          <div ref={mobileItemsRef} className="flex flex-col min-h-full px-7 py-4">
            {navItems.map((item) => (
              <div key={item.label} data-mobile-parent>
                <button
                  type="button"
                  onClick={() => toggleMobileDropdown(item.label)}
                  className="w-full flex items-center justify-between py-3 text-left"
                >
                  <span className="text-[14px] font-semibold text-ink">{item.label}</span>
                  <span
                    className={`text-bronze text-[14px] transition-transform duration-300 ${
                      mobileDropdown === item.label ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  style={{ gridTemplateRows: mobileDropdown === item.label ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div
                      className="pb-2 pl-3 space-y-0.5"
                      data-mobile-children={item.label}
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="block py-2 text-[13.5px] text-charcoal hover:text-bronze transition-colors"
                          onClick={closeMenu}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div
              className="flex flex-col gap-3 pt-4 mt-1 border-t border-cream-deep"
              data-mobile-ctas
            >
              <Link
                href="/espace"
                className="text-center px-[26px] py-[13px] text-[13.5px] font-medium text-ink border border-ink rounded-lg"
                onClick={closeMenu}
              >
                Espace client
              </Link>
              <Link
                href="/rendez-vous"
                className="text-center px-[26px] py-[13px] text-[13.5px] font-medium bg-ink text-cream rounded-lg"
                onClick={closeMenu}
              >
                Prendre rendez‑vous
              </Link>
            </div>

            {/* Footer lives here on mobile — the page footer is hidden below lg.
                `mt-auto` pins it to the bottom of the full-height panel. */}
            <div
              className="mt-auto pt-8 pb-2 text-center flex flex-col items-center gap-3"
              data-mobile-footer
            >
              <Link
                href="/contact"
                className="text-[13.5px] text-charcoal hover:text-bronze transition-colors"
                onClick={closeMenu}
              >
                Nous contacter
              </Link>
              <Link
                href="#"
                className="text-[13.5px] text-charcoal hover:text-bronze transition-colors"
                onClick={closeMenu}
              >
                Mentions légales
              </Link>
              <Link
                href="#"
                className="text-[13.5px] text-charcoal hover:text-bronze transition-colors"
                onClick={closeMenu}
              >
                Politique de confidentialité
              </Link>

              <p className="mt-4 text-[13px] text-warm-grey leading-relaxed max-w-[300px]">
                Cabinet de gestion de patrimoine au Maroc. Accompagnement personnalisé en
                structuration, investissement et transmission.
              </p>

              <p className="mt-2 text-[11.5px] text-warm-grey">
                &copy; {new Date().getFullYear()} Horkos Wealth Management. Tous droits réservés.
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
