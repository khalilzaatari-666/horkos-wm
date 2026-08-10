"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { DrawLine } from "@/components/ui/draw-line";
import { StackCards } from "@/components/ui/stack-cards";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const etapes = [
  {
    n: "1",
    badge: "Gratuit",
    title: "Diagnostic patrimonial",
    desc: "Premier rendez-vous d'exploration : nous comprenons votre situation et vos objectifs. Aucun engagement, aucun frais - pour tout le monde, à chaque fois.",
  },
  {
    n: "2",
    badge: "Commissions",
    title: "Structuration et investissement",
    desc: "Nous structurons votre patrimoine et vous orientons vers notre réseau de professionnels pour le mettre en œuvre, avec des solutions d'investissement. Vous payez uniquement des commissions sur les opérations réalisées.",
  },
  {
    n: "3",
    badge: "Honoraires",
    title: "Structuration seule (conseil)",
    desc: "Si votre besoin est uniquement un conseil en structuration patrimoniale, sans investissement associé, nous sommes rémunérés par des honoraires de conseil, clairement définis en amont.",
  },
];

type Etape = (typeof etapes)[number];

function EtapeCard({ etape, counterDelay = 0 }: { etape: Etape; counterDelay?: number }) {
  return (
    <div className="group bg-white border border-ink/[0.08] rounded-lg p-7 h-full flex flex-col shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-bronze/30">
      <div className="flex items-center gap-3 mb-4">
        <AnimatedCounter
          value={etape.n}
          className="font-heading text-[32px] text-bronze font-semibold leading-none"
          delay={counterDelay}
        />
        <span className="inline-block bg-bronze/10 text-bronze text-[11px] font-semibold tracking-[1px] uppercase px-2.5 py-1 rounded-md">
          {etape.badge}
        </span>
      </div>
      <h3 className="text-[17px] font-semibold mb-2.5">{etape.title}</h3>
      <p className="text-[14px] text-warm-grey leading-[1.65] flex-1">{etape.desc}</p>
    </div>
  );
}

export default function ModelePage() {
  const equationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const eq = equationRef.current;
      if (!eq) return;

      gsap.fromTo(
        gsap.utils.toArray<HTMLElement>("[data-eq-part]", eq),
        { opacity: 0, y: 20, scale: 0.8 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.15,
          ease: "back.out(2)",
          scrollTrigger: { trigger: eq, start: "top 85%", toggleActions: "play none none none" },
        }
      );
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set("[data-eq-part]", { opacity: 1 });
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
              Transparence
            </span>
          </AnimateIn>
          <SplitHeading
            text="Comment Horkos est rémunéré."
            className="text-[clamp(1.6rem,4vw,1.875rem)] font-medium text-cream max-w-[660px] leading-[1.3]"
            delay={200}
          />
          <AnimateIn variant="fade-up" delay={400}>
            <p className="text-[#D8CDBC] max-w-[620px] mt-3.5 text-[14.5px] leading-[1.7]">
              Le premier rendez-vous est toujours gratuit. Ce qui se passe ensuite dépend uniquement de ce que vous décidez - jamais de frais cachés, jamais deux catégories de frais à la fois.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Trois étapes */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-right">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Trois étapes, une seule règle : jamais de cumul
            </span>
          </AnimateIn>

          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-3 gap-6 mt-8">
            {etapes.map((e, i) => (
              <AnimateIn key={e.n} variant="reveal-up" delay={i * 150}>
                <EtapeCard etape={e} counterDelay={i * 150 + 300} />
              </AnimateIn>
            ))}
          </div>

          {/* Mobile: card deck */}
          <StackCards
            className="md:hidden mt-8"
            items={etapes.map((e) => (
              <EtapeCard key={e.n} etape={e} />
            ))}
          />

          {/* Équation */}
          <div ref={equationRef} className="mt-10 text-center">
            <div className="font-heading text-[28px] font-medium text-ink inline-flex items-center gap-2 flex-wrap justify-center">
              <span data-eq-part style={{ opacity: 0 }}>1 + 2</span>
              <span data-eq-part className="text-bronze" style={{ opacity: 0 }}>ou</span>
              <span data-eq-part style={{ opacity: 0 }}>1 + 3</span>
            </div>
            <div className="font-heading text-[20px] text-warm-grey italic mt-1" data-eq-part style={{ opacity: 0 }}>
              Jamais 1 + 2 + 3
            </div>
          </div>
        </div>
      </section>

      {/* Principe */}
      <section className="bg-ink text-cream py-16 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <AnimateIn variant="blur-in">
            <span className="text-bronze-light text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Notre principe
            </span>
          </AnimateIn>
          <SplitHeading
            text="Le client ne paie jamais deux fois"
            as="h2"
            className="text-[clamp(1.4rem,3.5vw,1.7rem)] font-semibold mt-2.5 mb-6 text-cream mx-auto max-w-[680px]"
            delay={200}
          />
          <AnimateIn variant="scale-in" delay={350}>
            <div className="bg-cream/[0.06] border border-cream/[0.12] rounded-lg p-7 max-w-[700px] mx-auto text-left text-[14.5px] leading-[1.7] text-[#D8CDBC]">
              <strong className="text-cream">Le diagnostic patrimonial est toujours gratuit.</strong><br />
              Selon la recommandation qui en découle, vous êtes facturés soit en commission sur vos opérations d&apos;investissement, soit en honoraires de conseil en structuration - jamais les deux sur le même besoin.
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <DrawLine className="w-16 h-px bg-bronze mx-auto mb-6" direction="center" />
          <AnimateIn variant="scale-in">
            <h2 className="text-[clamp(1.4rem,3.5vw,1.7rem)] font-semibold mx-auto max-w-[680px]">
              Prêt à commencer par un diagnostic gratuit ?
            </h2>
            <Link
              href="/rendez-vous"
              className="inline-block mt-4 px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-ink text-cream hover:bg-navy transition-colors rounded-lg"
            >
              Prendre rendez-vous →
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
