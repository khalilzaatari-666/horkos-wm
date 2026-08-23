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

const processSteps = [
  {
    n: "1",
    title: "Conseil en structuration",
    desc: "Nous analysons votre situation et concevons le montage le plus adapté - société, apport, régime fiscal.",
  },
  {
    n: "2",
    title: "Orientation vers le réseau",
    desc: "Nous vous mettons en relation avec l'expert-comptable, le notaire ou l'avocat fiscaliste adapté à votre dossier.",
  },
  {
    n: "3",
    title: "Implémentation & suivi",
    desc: "Le professionnel met en œuvre, nous restons impliqués dans le suivi et la gouvernance (étape R2).",
  },
];

const services = [
  { title: "Création de société", desc: "Holding, SCI, SARL immobilière." },
  { title: "Apport en nature", desc: "Expert valorisateur pour intégrer un bien au capital." },
  { title: "Gestion comptable déléguée", desc: "Un expert-comptable du réseau prend en charge la tenue comptable." },
  { title: "Structuration fiscale", desc: "Un avocat fiscaliste sécurise le montage." },
];

const apportSteps = [
  "Vous détenez un bien immobilier en nom propre",
  "Un expert valorisateur évalue le bien",
  "Le bien est apporté au capital d'une SARL immobilière",
  "Un expert-comptable gère la société",
  "Un notaire formalise l'apport",
];

function ProcessCard({ step, counterDelay = 0 }: { step: (typeof processSteps)[number]; counterDelay?: number }) {
  return (
    <div className="bg-cream rounded-lg p-7 h-full border border-cream-deep shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <AnimatedCounter
        value={step.n}
        className="font-heading text-[28px] text-bronze font-semibold mb-3 block"
        delay={counterDelay}
      />
      <h3 className="text-[20px] font-semibold leading-[1.3] mb-2">{step.title}</h3>
      <p className="text-[14px] text-warm-grey leading-[1.65]">{step.desc}</p>
    </div>
  );
}

function ServiceCard({ service }: { service: (typeof services)[number] }) {
  return (
    <div className="bg-white rounded-lg p-6 h-full border border-ink/[0.06] shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <h4 className="text-[15px] font-semibold mb-2">{service.title}</h4>
      <p className="text-[13.5px] text-warm-grey leading-[1.6]">{service.desc}</p>
    </div>
  );
}

export default function StructurationPage() {
  const stepsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add(
      {
        isMobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        isDesktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const list = stepsRef.current;
        if (!list) return;

        const { isMobile } = context.conditions as { isMobile: boolean; isDesktop: boolean };
        const items = gsap.utils.toArray<HTMLElement>("li", list);

        if (isMobile) {
          // Each step lands on its own as you reach it, badge popping in after the row.
          items.forEach((item) => {
            gsap.fromTo(
              item,
              { opacity: 0, x: -24 },
              {
                opacity: 1,
                x: 0,
                duration: 0.45,
                ease: "power3.out",
                scrollTrigger: { trigger: item, start: "top 93%", toggleActions: "play none none none" },
              }
            );
            gsap.fromTo(
              item.querySelector("[data-step-badge]"),
              { scale: 0 },
              {
                scale: 1,
                duration: 0.4,
                delay: 0.12,
                ease: "back.out(3)",
                scrollTrigger: { trigger: item, start: "top 93%", toggleActions: "play none none none" },
              }
            );
          });
        } else {
          gsap.fromTo(
            items,
            { opacity: 0, x: -30 },
            {
              opacity: 1,
              x: 0,
              duration: 0.5,
              stagger: 0.12,
              ease: "power3.out",
              scrollTrigger: { trigger: list, start: "top 80%", toggleActions: "play none none none" },
            }
          );
        }
      }
    );

    mm.add("(prefers-reduced-motion: reduce)", () => {
      if (stepsRef.current) gsap.set(stepsRef.current.querySelectorAll("li"), { opacity: 1 });
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
              Structuration & création de sociétés
            </span>
          </AnimateIn>
          <SplitHeading
            text="Structurer votre patrimoine, pas seulement le placer."
            className="text-[clamp(1.8rem,4.3vw,2.2rem)] font-medium text-cream max-w-[660px] leading-[1.3]"
            delay={200}
          />
          <AnimateIn variant="fade-up" delay={400}>
            <p className="text-[#D8CDBC] max-w-[620px] mt-3.5 text-[14.5px] leading-[1.7]">
              Horkos crée et structure des sociétés patrimoniales pour ses clients en mobilisant les professionnels du réseau : comptables, experts valorisateurs, avocats fiscalistes, notaires.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Notre rôle - process */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-right">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Notre rôle
            </span>
          </AnimateIn>
          <SplitHeading
            text="D'abord le conseil, ensuite l'implémentation"
            as="h2"
            className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-3"
            delay={100}
          />
          <AnimateIn variant="fade-up" delay={200}>
            <p className="text-[14.5px] text-warm-grey max-w-[680px] leading-[1.7] mb-8">
              Nous ne sommes ni comptables, ni notaires, ni avocats. Notre rôle est de concevoir la stratégie de structuration la plus adaptée à votre situation, puis de vous orienter vers le bon professionnel du réseau pour la mettre en œuvre.
            </p>
          </AnimateIn>

          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-3 gap-6">
            {processSteps.map((s, i) => (
              <AnimateIn key={s.n} variant="reveal-up" delay={i * 150}>
                <ProcessCard step={s} counterDelay={i * 150 + 300} />
              </AnimateIn>
            ))}
          </div>

          {/* Mobile: card deck */}
          <StackCards
            className="md:hidden"
            items={processSteps.map((s) => (
              <ProcessCard key={s.n} step={s} />
            ))}
          />
        </div>
      </section>

      {/* Quatre briques */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-right">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Nos services
            </span>
          </AnimateIn>
          <SplitHeading
            text="Quatre briques de structuration"
            as="h2"
            className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-8"
            delay={100}
          />

          {/* Desktop: grid */}
          <div className="hidden md:grid md:grid-cols-4 gap-5">
            {services.map((s, i) => (
              <AnimateIn key={s.title} variant="rotate-in" delay={i * 100}>
                <ServiceCard service={s} />
              </AnimateIn>
            ))}
          </div>

          {/* Mobile: card deck */}
          <StackCards
            className="md:hidden"
            items={services.map((s) => (
              <ServiceCard key={s.title} service={s} />
            ))}
          />
        </div>
      </section>

      {/* Cas d'usage - Apport immobilier */}
      <section className="bg-ink text-cream py-16 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <AnimateIn variant="fade-right">
                <span className="text-bronze-light text-[11.5px] font-semibold tracking-[1.8px] uppercase">
                  Cas d&apos;usage fréquent
                </span>
              </AnimateIn>
              <SplitHeading
                text="Intégrer un bien immobilier dans une société"
                as="h2"
                className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-6 text-cream"
                delay={100}
              />
              <ul ref={stepsRef} className="space-y-3">
                {apportSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3" style={{ opacity: 0 }}>
                    <span
                      data-step-badge
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-bronze/20 text-bronze text-[11px] font-semibold flex items-center justify-center mt-0.5"
                    >
                      {i + 1}
                    </span>
                    <span className="text-[14.5px] text-[#D8CDBC] leading-[1.6]">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <AnimateIn variant="scale-in" mobileVariant="reveal-up" delay={200}>
              <div className="bg-cream/[0.06] border border-cream/[0.12] rounded-lg p-7">
                <h4 className="text-[16.5px] font-semibold text-cream mb-3">
                  Pourquoi structurer plutôt que détenir en nom propre ?
                </h4>
                <p className="text-[14.5px] text-[#D8CDBC] leading-[1.7]">
                  La détention via société facilite la transmission par cession de parts, permet une gestion comptable rigoureuse, et ouvre des options fiscales non disponibles en direct.
                </p>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <DrawLine className="w-16 h-px bg-bronze mx-auto mb-6" direction="center" />
          <AnimateIn variant="scale-in">
            <h2 className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mx-auto max-w-[680px]">
              Une situation à structurer ?
            </h2>
            <Link
              href="/rendez-vous"
              className="inline-block mt-4 px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
            >
              Prendre rendez-vous structuration →
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
