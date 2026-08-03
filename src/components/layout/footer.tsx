"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function Footer() {
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const mm = gsap.matchMedia();

    // The footer only renders at lg and above, so there is no mobile branch.
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        gsap.utils.toArray<HTMLElement>("[data-footer-col]", footer),
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: footer, start: "top 90%", toggleActions: "play none none none" },
        }
      );

      gsap.fromTo(
        footer.querySelector("[data-footer-bottom]"),
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.5,
          delay: 0.5,
          scrollTrigger: { trigger: footer, start: "top 90%", toggleActions: "play none none none" },
        }
      );
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(footer.querySelectorAll("[data-footer-col], [data-footer-bottom]"), { opacity: 1 });
    });

    return () => mm.revert();
  }, []);

  // Below lg the hamburger menu carries the footer content instead.
  return (
    <footer className="hidden lg:block bg-ink text-white">
      <div ref={footerRef} className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start" data-footer-col style={{ opacity: 0 }}>
            <Image
              src="/images/logo-light.png"
              alt="Horkos Wealth Management"
              width={160}
              height={56}
              className="h-16 w-auto"
            />
            <p className="mt-4 text-sm text-warm-grey leading-relaxed">
              Cabinet de gestion de patrimoine au Maroc. Accompagnement
              personnalisé en structuration, investissement et transmission.
            </p>
          </div>

          {/* Le cabinet */}
          <div data-footer-col style={{ opacity: 0 }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-bronze-light mb-4">
              Le cabinet
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/cabinet/approche" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Notre approche
                </Link>
              </li>
              <li>
                <Link href="/cabinet/modele" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Notre modèle
                </Link>
              </li>
              <li>
                <Link href="/cabinet/produits" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Nos produits
                </Link>
              </li>
            </ul>
          </div>

          {/* Conseil */}
          <div data-footer-col style={{ opacity: 0 }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-bronze-light mb-4">
              Conseil
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/conseil/structuration" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Structuration patrimoniale
                </Link>
              </li>
              <li>
                <Link href="/conseil/reseau" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Réseau de professionnels
                </Link>
              </li>
              <li>
                <Link href="/conseil/cas-usage" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Cas d&apos;usage
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div data-footer-col style={{ opacity: 0 }}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-bronze-light mb-4">
              Contact
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Nous contacter
                </Link>
              </li>
              <li>
                <Link href="/ressources/articles" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Articles
                </Link>
              </li>
              <li>
                <Link href="/ressources/guides" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Guides
                </Link>
              </li>
              <li>
                <Link href="/questionnaire" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Prendre rendez‑vous
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4"
          data-footer-bottom
          style={{ opacity: 0 }}
        >
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Horkos Wealth Management. Tous droits réservés.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-xs text-gray-500 hover:text-white transition-colors">
              Mentions légales
            </Link>
            <Link href="#" className="text-xs text-gray-500 hover:text-white transition-colors">
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
