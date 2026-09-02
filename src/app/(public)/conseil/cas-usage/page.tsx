"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";
import { DrawLine } from "@/components/ui/draw-line";
import { StackCards } from "@/components/ui/stack-cards";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface CaseDetail {
  label: string;
  text: string;
}

interface UseCase {
  icon: string;
  tag: string;
  title: string;
  punch: string;
  details: CaseDetail[];
}

const cases: UseCase[] = [
  {
    icon: "T",
    tag: "Transmission",
    title: "Intégrer un bien immobilier dans une société",
    punch: "\"Transmettre un immeuble à mes enfants, sans indivision.\"",
    details: [
      { label: "Objectif", text: "Un entrepreneur veut préparer la transmission d'un immeuble locatif à ses deux enfants sans indivision complexe." },
      { label: "Accompagnement", text: "Nous avons audité sa situation, fait évaluer le bien par un expert indépendant, puis structuré son apport au capital d'une société immobilière dont un expert-comptable du réseau tient aujourd'hui la comptabilité." },
      { label: "Suivi", text: "La transmission se fait désormais par simple donation de parts, et la famille suit l'évolution de la société chaque mois depuis son espace client." },
    ],
  },
  {
    icon: "D",
    tag: "Diversification",
    title: "Diversifier une trésorerie d'entreprise",
    punch: "\"Faire fructifier ma trésorerie sans l'immobiliser.\"",
    details: [
      { label: "Objectif", text: "Un dirigeant de PME veut faire fructifier une trésorerie excédentaire sans l'immobiliser sur le très long terme." },
      { label: "Accompagnement", text: "Après avoir compris ses besoins de liquidité, nous avons construit une stratégie combinant assurance-vie et fonds en détention directe, pour garder une partie des sommes mobilisable à tout moment." },
      { label: "Suivi", text: "Son portefeuille est aujourd'hui réparti entre une poche liquide et une poche de rendement, avec un point avec son conseiller chaque trimestre." },
    ],
  },
  {
    icon: "R",
    tag: "Retraite & fiscalité",
    title: "Préparer sa retraite en optimisant sa fiscalité",
    punch: "\"Réduire mes impôts aujourd'hui, préparer demain.\"",
    details: [
      { label: "Objectif", text: "Un cadre dirigeant à revenu élevé veut préparer sa retraite tout en réduisant son revenu imposable dès aujourd'hui." },
      { label: "Accompagnement", text: "Nous avons construit une stratégie combinant un plan d'épargne retraite et un contrat d'assurance-vie, puis mis ce client en relation avec un avocat fiscaliste du réseau pour sécuriser le montage." },
      { label: "Suivi", text: "Son revenu imposable a baissé dès la première année, pendant que son épargne retraite se constitue progressivement, avec un bilan chaque année." },
    ],
  },
];

function CaseCard({ useCase }: { useCase: UseCase }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="bg-cream rounded-lg p-7 border border-cream-deep shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full flex flex-col"
      onClick={() => setOpen(!open)}
    >
      <div className="w-10 h-10 rounded-full bg-ink text-cream flex items-center justify-center font-heading text-[18px] font-semibold mb-4">
        {useCase.icon}
      </div>
      <span className="inline-block bg-bronze/10 text-bronze text-[11px] font-semibold tracking-[1px] uppercase px-2.5 py-1 rounded-md mb-3">
        {useCase.tag}
      </span>
      <h3 className="text-[21.5px] font-semibold mb-2 leading-[1.3]">{useCase.title}</h3>
      <p className="text-[14px] text-warm-grey italic leading-[1.6] mb-4 flex-1">{useCase.punch}</p>

      <span className="text-[13px] text-bronze-dark font-medium flex items-center gap-1.5">
        Voir le détail
        <span className={`transition-transform duration-300 ${open ? "rotate-90" : ""}`}>▸</span>
      </span>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pt-5 mt-4 border-t border-ink/[0.08] space-y-4">
            {useCase.details.map((d) => (
              <div key={d.label}>
                <span className="text-[11.5px] font-semibold tracking-[1.2px] uppercase text-bronze-dark">{d.label}</span>
                <p className="text-[14px] text-warm-grey leading-[1.65] mt-1">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CasUsagePage() {
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    // Desktop only - mobile uses the StackCards deck below.
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const grid = cardsRef.current;
      if (!grid) return;

      gsap.fromTo(
        gsap.utils.toArray<HTMLElement>("[data-case-card]", grid),
        { opacity: 0, y: 50, rotateZ: -1.5, scale: 0.92 },
        {
          opacity: 1,
          y: 0,
          rotateZ: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: grid, start: "top 80%", toggleActions: "play none none none" },
        }
      );
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set("[data-case-card]", { opacity: 1 });
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
              Nos cas d&apos;usage
            </span>
          </AnimateIn>
          <SplitHeading
            text="Trois situations, trois stratégies sur-mesure."
            className="text-[clamp(1.8rem,4.3vw,2.2rem)] font-medium text-cream max-w-[660px] leading-[1.3]"
            delay={200}
          />
          <AnimateIn variant="fade-up" delay={400}>
            <p className="text-[#D8CDBC] max-w-[620px] mt-3.5 text-[16px] leading-[1.7]">
              Chaque client a un objectif différent. Cliquez sur une situation pour voir comment nous l&apos;avons accompagnée.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Cases */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          {/* Desktop: grid */}
          <div ref={cardsRef} className="hidden md:grid md:grid-cols-3 gap-6">
            {cases.map((c) => (
              <div key={c.icon} data-case-card style={{ opacity: 0 }}>
                <CaseCard useCase={c} />
              </div>
            ))}
          </div>

          {/* Mobile: card deck that stacks as you scroll */}
          <StackCards
            className="md:hidden"
            items={cases.map((c) => (
              <CaseCard key={c.icon} useCase={c} />
            ))}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <DrawLine className="w-16 h-px bg-bronze mx-auto mb-6" direction="center" />
          <AnimateIn variant="scale-in">
            <h2 className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mx-auto max-w-[680px]">
              Votre situation ressemble à l&apos;une de ces histoires ?
            </h2>
            <Link
              href="/rendez-vous"
              className="inline-block mt-4 px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
            >
              Prendre rendez-vous →
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
