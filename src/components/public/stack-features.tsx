"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Recul de chaque carte recouverte : 5 % d'échelle, voile d'encre à 20 %. */
const STEP_SCALE = 0.05;
const STEP_DIM = 0.2;
/** Décalage vertical de chaque carte sur la précédente, une fois empilées. */
const DECALAGE = 22;

export interface StackFeature {
  title: string;
  desc: string;
  href: string;
  linkLabel: string;
  image: string;
  /** Lignes de détail facultatives (libellé, valeur), sous le texte. */
  facts?: [string, string][];
}

/**
 * Grandes cartes photographiques qui s'empilent au défilement : chacune reste
 * collée au milieu de l'écran pendant que la suivante monte la recouvrir. Le texte
 * se pose sur la partie sombre de la photographie, à gauche. Sur desktop, une
 * carte recouverte recule et s'assombrit d'un cran à chaque carte qui monte.
 */
export function StackFeatures({ items }: { items: StackFeature[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const articles = Array.from(el.querySelectorAll<HTMLElement>(":scope > article"));
      const stickyTop = (a: HTMLElement) => parseFloat(getComputedStyle(a).top) || 0;
      articles.forEach((article, i) => {
        const card = article.querySelector<HTMLElement>("[data-card]");
        const shade = article.querySelector<HTMLElement>("[data-shade]");
        gsap.set(card, { transformOrigin: "50% 0" });
        for (let j = i + 1; j < articles.length; j++) {
          const d = j - i;
          // Seulement pendant que la carte j recouvre la précédente : de son
          // contact avec le bas de celle-ci, collée, jusqu'à son propre collage.
          // Avant, la carte du dessus reste intacte.
          const scrollTrigger = {
            trigger: articles[j],
            start: () => `top ${stickyTop(articles[j - 1]) + articles[j - 1].offsetHeight}px`,
            end: () => `top ${stickyTop(articles[j])}px`,
            scrub: true,
            invalidateOnRefresh: true,
          };
          gsap.fromTo(
            card,
            { scale: 1 - (d - 1) * STEP_SCALE },
            { scale: 1 - d * STEP_SCALE, ease: "none", immediateRender: false, scrollTrigger },
          );
          // Voile d'encre plutôt qu'un `filter` : l'opacité ne repeint pas la
          // photographie à chaque image du défilement.
          gsap.fromTo(
            shade,
            { opacity: (d - 1) * STEP_DIM },
            { opacity: d * STEP_DIM, ease: "none", immediateRender: false, scrollTrigger },
          );
        }
      });
    });
    return () => mm.revert();
  }, []);

  // La pile (une carte, plus le décalage de chaque carte suivante) se colle
  // au milieu de l'écran sous l'en-tête de 84 px, jamais plus haut que 96 px.
  const pile = `(var(--carte) + ${(items.length - 1) * DECALAGE}px)`;
  return (
    <div ref={ref} className="relative [--carte:clamp(440px,72svh,560px)]">
      {items.map((it, i) => (
        <article
          key={it.title}
          className="sticky mb-6 last:mb-0"
          style={{ top: `calc(max(96px, (100svh + 84px - ${pile}) / 2) + ${i * DECALAGE}px)` }}
        >
          <div data-card className="relative h-[var(--carte)] overflow-hidden rounded-[20px] bg-ink text-cream shadow-[0_-12px_40px_-24px_rgba(11,26,46,0.5)]">
            <Image
              src={it.image}
              alt=""
              fill
              sizes="(min-width: 1320px) 1240px, 100vw"
              className="object-cover object-right"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-ink/0 max-md:bg-gradient-to-t max-md:from-ink/90 max-md:via-ink/55"
            />
            <div className="relative flex h-full max-w-[520px] flex-col justify-end p-7 sm:p-10 lg:p-14">
              <h3 className="display-md text-cream">{it.title}</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-cream-muted">{it.desc}</p>
              {it.facts && (
                <dl className="mt-6 divide-y divide-cream/15 border-y border-cream/15 text-[15px]">
                  {it.facts.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-6 py-2.5">
                      <dt className="text-cream-muted">{k}</dt>
                      <dd className="text-cream">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <Link href={it.href} className="btn btn-light btn-sm mt-8 self-start">
                {it.linkLabel} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div data-shade aria-hidden="true" className="pointer-events-none absolute inset-0 bg-ink opacity-0" />
          </div>
        </article>
      ))}
    </div>
  );
}
