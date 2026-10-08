"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FragDocument, FragJalons, FragRdv, FragReco } from "./ui-fragments";

gsap.registerPlugin(ScrollTrigger);

/**
 * L'espace client posé sur une photographie : quatre fragments d'interface
 * empilés, qui glissent à des vitesses différentes au défilement.
 */
export function UiStack({
  image = "/images/editorial/arches.jpg",
  className = "",
  compact = false,
}: {
  image?: string;
  className?: string;
  /** Version des écrans de connexion : photo carrée, trois fragments en quinconce. */
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      el.querySelectorAll<HTMLElement>("[data-depth]").forEach((card) => {
        const depth = Number(card.dataset.depth);
        gsap.fromTo(
          card,
          { y: 60 * depth },
          {
            y: -60 * depth,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
      gsap.fromTo(
        el.querySelector("[data-photo]"),
        { scale: 1.12 },
        { scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } },
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <figure ref={ref} className={`relative ${className}`}>
      <div
        className={`relative overflow-hidden rounded-[28px] bg-cream-deep ${
          compact ? "aspect-square" : "aspect-[4/5] sm:aspect-[5/4] lg:aspect-[6/5]"
        }`}
      >
        <div data-photo className="absolute inset-0">
          <Image src={image} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-ink/10" />

        <div className="absolute inset-0 p-5 sm:p-8 lg:p-10">
          {compact ? (
            /* Écrans de connexion : trois fragments en quinconce sur toute la
               largeur, à largeur fixe pour que rien ne se replie. */
            <div className="relative h-full">
              <FragJalons className="absolute top-0 left-0 w-[min(300px,78%)]" />
              <FragDocument className="absolute top-[45%] right-0 w-[min(290px,78%)]" />
              <FragRdv className="absolute bottom-0 left-[6%] w-[min(310px,80%)]" />
            </div>
          ) : (
            /* Deux colonnes décalées : le suivi et le document à gauche, la
               recommandation puis le prochain rendez-vous juste dessous, à droite. */
            <div className="relative h-full">
              <div data-depth="0.5" className="absolute top-0 sm:top-[9%] bottom-0 sm:bottom-[20%] left-0 flex w-[min(320px,88%)] flex-col justify-between gap-3 sm:w-[min(320px,49%)]">
                <FragJalons />
                <div className="hidden sm:block">
                  <FragDocument />
                </div>
              </div>
              <div data-depth="1" className="absolute right-0 bottom-0 flex w-[min(330px,92%)] flex-col justify-between gap-3 sm:top-[27%] sm:w-[min(330px,49%)]">
                <div className="hidden sm:block">
                  <FragReco />
                </div>
                <FragRdv />
              </div>
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-3 text-[13px] text-warm-grey">
        Aperçu de l’espace client - données d’illustration.
      </figcaption>
    </figure>
  );
}
