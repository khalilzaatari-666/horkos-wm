"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";
import { DrawLine } from "@/components/ui/draw-line";
import { StackCards } from "@/components/ui/stack-cards";
import { PartenariatForm } from "./partenariat-form";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const partenaires = [
  { title: "Sociétés de gestion", desc: "Gestion d'actifs et sélection de fonds pour vos placements financiers (OPCVM, PEA)." },
  { title: "Assureurs", desc: "Contrats d'assurance-vie, PER et solutions de prévoyance patrimoniale." },
  { title: "Agents immobiliers", desc: "Sourcing d'opportunités locatives, commerciales et résidentielles." },
  { title: "Fonds de Private Equity", desc: "Accès à des prises de participation dans des entreprises non cotées." },
  { title: "Fonds de Venture Capital", desc: "Accès à des levées de fonds de startups marocaines et régionales sélectionnées." },
];

function PartnerCard({ partner }: { partner: (typeof partenaires)[number] }) {
  return (
    <div className="bg-cream rounded-lg p-6 h-full border border-cream-deep shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <h4 className="text-[16.5px] font-semibold mb-2">{partner.title}</h4>
      <p className="text-[13.5px] text-warm-grey leading-[1.6]">{partner.desc}</p>
    </div>
  );
}

export default function ReseauPage() {
  const partnersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    // Desktop only - mobile uses the StackCards deck.
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const wrap = partnersRef.current;
      if (!wrap) return;

      gsap.fromTo(
        gsap.utils.toArray<HTMLElement>("[data-partner-card]", wrap),
        { opacity: 0, y: 30, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: "back.out(1.2)",
          scrollTrigger: { trigger: wrap, start: "top 80%", toggleActions: "play none none none" },
        }
      );
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set("[data-partner-card]", { opacity: 1 });
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
              Le réseau qui alimente vos opportunités
            </span>
          </AnimateIn>
          <SplitHeading
            text="Les partenaires qui nous apportent des opportunités d'investissement."
            className="text-[clamp(1.8rem,4.3vw,2.2rem)] font-medium text-cream max-w-[660px] leading-[1.3]"
            delay={200}
          />
          <AnimateIn variant="fade-up" delay={400}>
            <p className="text-[#D8CDBC] max-w-[620px] mt-3.5 text-[16px] leading-[1.7]">
              Sociétés de gestion, assureurs, agents immobiliers, fonds de Private Equity et de Venture Capital : ce réseau nous permet d&apos;accéder à des opportunités et de les sélectionner pour vous.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Callout + Partenaires */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-left">
            <div className="bg-cream-deep/60 border-l-2 border-bronze-light rounded-r-lg p-5 mb-10 text-[14.5px] text-charcoal leading-[1.7] max-w-[700px]">
              &quot;Nous ne créons pas les opportunités, nous les sélectionnons. Ce réseau nourrit nos recommandations, il ne les remplace pas.&quot;
            </div>
          </AnimateIn>

          <AnimateIn variant="fade-right">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Nos partenaires de sourcing
            </span>
          </AnimateIn>
          <SplitHeading
            text="Cinq réseaux, mobilisés selon la classe d'actifs"
            as="h2"
            className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-8"
            delay={100}
          />

          {/* Desktop: grid */}
          <div ref={partnersRef} className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-5">
            {partenaires.map((p) => (
              <div key={p.title} data-partner-card style={{ opacity: 0 }}>
                <PartnerCard partner={p} />
              </div>
            ))}
          </div>

          {/* Mobile: card deck */}
          <StackCards
            className="md:hidden"
            items={partenaires.map((p) => (
              <PartnerCard key={p.title} partner={p} />
            ))}
          />

          <AnimateIn variant="fade-up" delay={500}>
            <div className="mt-5">
              <Link href="/conseil/structuration" className="text-[12.5px] text-bronze-dark font-medium hover:text-bronze transition-colors">
                Voir le réseau de mise en œuvre (structuration) →
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Questionnaire partenariat */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="blur-in">
            <div className="text-center max-w-[640px] mx-auto mb-10">
              <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
                Pour les partenaires
              </span>
              <h2 className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-3">
                Vous êtes un acteur spécialisé ? Proposez vos opportunités.
              </h2>
              <p className="text-[16px] text-warm-grey leading-[1.7]">
                Société de gestion, assureur, agent immobilier, fonds Private Equity / Venture Capital ou porteur d&apos;un partenariat business - sélectionnez votre catégorie, nous étudions et présentons de façon sélective à nos clients.
              </p>
            </div>
          </AnimateIn>

          <AnimateIn variant="scale-in" delay={150}>
            <PartenariatForm />
          </AnimateIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <DrawLine className="w-16 h-px bg-bronze mx-auto mb-6" direction="center" />
          <AnimateIn variant="scale-in">
            <h2 className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mx-auto max-w-[680px]">
              Une opportunité qui correspond à votre profil ?
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
