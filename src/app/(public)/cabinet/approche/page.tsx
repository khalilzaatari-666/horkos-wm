"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";
import { DrawLine } from "@/components/ui/draw-line";
import { SwipeRow } from "@/components/ui/swipe-row";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const principes = [
  { n: "1", title: "Partir de votre besoin" },
  { n: "2", title: "Expliquer, sans raccourci" },
  { n: "3", title: "Sélectionner ce qui sert l'objectif" },
  { n: "4", title: "Décider ensemble" },
  { n: "5", title: "Rester dans la durée" },
];

const philosophie = [
  { n: "1", title: "Nous partons de votre objectif", desc: "Aucune recommandation n'est faite avant d'avoir clarifié ce que vous cherchez réellement à accomplir." },
  { n: "2", title: "Nous coordonnons, jamais seuls", desc: "Chaque structuration mobilise des métiers spécialisés - nous les orchestrons pour vous." },
  { n: "3", title: "Nous restons impliqués après la décision", desc: "Notre rôle ne s'arrête pas à la signature." },
];

export default function ApprochePage() {
  const stripRef = useRef<HTMLDivElement>(null);

  // Desktop grid entrance — the mobile row is handled by SwipeRow itself.
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const strip = stripRef.current;
      if (!strip) return;

      gsap.fromTo(
        gsap.utils.toArray<HTMLElement>("[data-strip-card]", strip),
        { opacity: 0, y: 40, scale: 0.9, rotateZ: -2 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateZ: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "back.out(1.4)",
          scrollTrigger: { trigger: strip, start: "top 80%", toggleActions: "play none none none" },
        }
      );
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set("[data-strip-card]", { opacity: 1 });
    });

    return () => mm.revert();
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-cream pt-[50px] pb-[36px] overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="blur-in" duration={0.5}>
            <span className="inline-block bg-cream/[0.08] border border-cream/[0.18] text-bronze-light text-[11px] font-semibold tracking-[1.5px] uppercase px-3.5 py-1.5 mb-4">
              Notre approche
            </span>
          </AnimateIn>
          <SplitHeading
            text="Comprendre. Structurer. Décider avec clarté."
            className="text-[clamp(1.6rem,4vw,1.875rem)] font-medium text-cream max-w-[660px] leading-[1.3]"
            delay={200}
          />
          <AnimateIn variant="fade-up" delay={400}>
            <p className="text-[#D8CDBC] max-w-[560px] mt-3.5 text-[14.5px] leading-[1.7]">
              Cinq principes qui guident chaque accompagnement, du premier échange au suivi dans la durée.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Méthode strip */}
      <section className="pt-9 pb-16">
        {/* Desktop: five across */}
        <div className="hidden md:block max-w-[1200px] mx-auto px-7">
          <div ref={stripRef} className="grid grid-cols-5 gap-4 mt-1.5">
            {principes.map((p) => (
              <div
                key={p.n}
                data-strip-card
                className="group border-t-2 border-bronze pt-5 pb-6 rounded-lg cursor-default transition-all duration-300 hover:bg-cream hover:shadow-md hover:scale-[1.06] hover:z-10 relative"
                style={{ opacity: 0 }}
              >
                <div className="font-heading text-[20px] text-bronze font-semibold transition-transform duration-300 group-hover:translate-x-1.5">{p.n}</div>
                <h4 className="text-[13px] mt-1.5 leading-[1.35] font-medium transition-transform duration-300 group-hover:translate-x-1.5">{p.title}</h4>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: one swipeable row, snapping card to card */}
        <SwipeRow
          className="md:hidden mt-1.5"
          cardBasis="58%"
          items={principes.map((p) => (
            <div
              key={p.n}
              className="border-t-2 border-bronze bg-cream/40 rounded-b-lg px-4 pt-5 pb-6"
            >
              <div className="font-heading text-[20px] text-bronze font-semibold">{p.n}</div>
              <h4 className="text-[13px] mt-1.5 leading-[1.35] font-medium">{p.title}</h4>
            </div>
          ))}
        />
      </section>

      {/* Philosophie */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-right">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Notre philosophie
            </span>
          </AnimateIn>
          <SplitHeading
            text="On ne vend pas de produits. On structure un patrimoine."
            as="h2"
            className="text-[clamp(1.4rem,3.5vw,1.7rem)] font-semibold mt-2.5 mb-6 max-w-[680px]"
            delay={100}
          />
          <div>
            {philosophie.map((p, i) => (
              <AnimateIn
                key={p.n}
                variant={i % 2 === 0 ? "fade-right" : "fade-left"}
                mobileVariant="fade-left"
                delay={i * 120}
              >
                <div className={`grid grid-cols-[56px_1fr] gap-[26px] py-6 border-t border-ink/[0.08] ${i === philosophie.length - 1 ? "border-b" : ""}`}>
                  <div className="font-heading text-[26px] text-bronze font-medium">{p.n}</div>
                  <div>
                    <h3 className="text-[16.5px] font-semibold mb-1.5">{p.title}</h3>
                    <p className="text-[14px] text-warm-grey max-w-[560px] leading-[1.6]">{p.desc}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <DrawLine className="w-16 h-px bg-bronze mx-auto mb-6" direction="center" />
          <AnimateIn variant="scale-in">
            <h2 className="text-[clamp(1.4rem,3.5vw,1.7rem)] font-semibold mx-auto max-w-[680px]">
              Voir cette méthode appliquée à des cas réels
            </h2>
            <Link
              href="/conseil/cas-usage"
              className="inline-block mt-4 px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
            >
              Consulter nos cas d&apos;usage →
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
