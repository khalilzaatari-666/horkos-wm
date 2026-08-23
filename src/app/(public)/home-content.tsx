"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { DrawLine } from "@/components/ui/draw-line";
import { StackCards } from "@/components/ui/stack-cards";
import { MarqueeRow } from "@/components/ui/marquee-row";
import { BesoinIcon } from "@/components/icons/besoin-icons";
import { besoinsParticuliers, besoinsEntreprises, type Besoin } from "@/lib/besoins";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  { n: "1", title: "Comprendre votre situation", desc: "Un premier échange, puis un audit patrimonial qui sert de socle." },
  { n: "2", title: "Construire votre stratégie d'investissement", desc: "Recommandations sur-mesure." },
  { n: "3", title: "Suivre dans la durée", desc: "Gouvernance, reporting et ajustement continu." },
];

const trustCards = [
  { title: "Aucune recommandation d'investissement sans compréhension", desc: "Chaque recommandation est expliquée dans le détail, jusqu'à ce que vous puissiez la reformuler avec vos propres mots." },
  { title: "Confidentialité", desc: "Vos informations patrimoniales ne sont jamais partagées sans votre consentement." },
  { title: "Rigueur réglementaire", desc: "Horkos Conseil structure son activité en conformité avec les cadres AMMC et ACAPS." },
];

const faqs = [
  { q: "Horkos, c'est quoi ?", a: "Un cabinet de conseil en gestion de patrimoine qui centralise vos besoins et s'appuie sur un réseau de professionnels spécialisés." },
  { q: "Est-ce que vous poussez des produits ?", a: "Non. Chaque recommandation part d'un besoin identifié avec vous." },
  { q: "Horkos gère-t-il mon argent directement ?", a: "Non. Horkos formule des recommandations, vous restez seul décisionnaire." },
];

function BesoinCard({ icon, title, desc, image, href }: Besoin) {
  const shell =
    "group h-full flex flex-col bg-white border border-cream-deep rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300";

  const body = (
    <>
      <div className="relative aspect-[4/3] bg-cream-deep overflow-hidden">
        {/* The plate is what the cut-out illustration sits on; without it a
            transparent PNG/SVG would float on a flat swatch. */}
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 35%, rgba(169,120,79,0.18) 0%, rgba(169,120,79,0.04) 55%, transparent 100%)",
          }}
        />
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            // Cut-out artwork: contain, never cover, or the drawing gets cropped.
            // SVGs gain nothing from the optimiser and it rejects them by default.
            unoptimized
            sizes="(max-width: 640px) 260px, 300px"
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-bronze-dark">
            <BesoinIcon
              name={icon}
              variant="duotone"
              className="w-[42%] h-auto transition-transform duration-500 group-hover:scale-[1.06]"
            />
          </span>
        )}
      </div>

      <div className="flex-1 p-5">
        {/* Pas de hauteur minimale ici : elle réservait deux lignes pour tous les
            titres et creusait un blanc sous ceux qui n'en prennent qu'une. Les
            cartes gardent la même hauteur par l'étirement du flex. */}
        <h4 className="text-[14.5px] font-semibold text-ink leading-[1.35]">{title}</h4>
        <p className="text-[12.5px] text-warm-grey leading-[1.55] mt-1.5">{desc}</p>
      </div>
    </>
  );

  // Seule la carte qui mène quelque part devient un lien. Les autres restent de
  // la présentation : rien à survoler au curseur main, rien dans la tabulation.
  if (!href) return <div className={shell}>{body}</div>;

  return (
    <Link
      href={href}
      // Vers une ancre, Next saute à la section dès l'arrivée ; `HashScroll` s'en
      // charge à sa place, en descendant en douceur depuis le haut de la page.
      scroll={!href.includes("#")}
      className={`${shell} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze`}
    >
      {body}
    </Link>
  );
}

/** Intitulé de rangée centré entre deux filets, qui prennent le reste. */
function RowLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 mb-3 ${className}`}>
      <span className="flex-1 h-px bg-cream-deep" />
      <span className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase">
        {children}
      </span>
      <span className="flex-1 h-px bg-cream-deep" />
    </div>
  );
}

function TrustCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white p-[26px] border border-cream-deep h-full rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <h4 className="text-[16.5px] font-semibold mb-2">{title}</h4>
      <p className="text-[13px] text-warm-grey leading-[1.6]">{desc}</p>
    </div>
  );
}

export function HomeContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add(
      {
        isMobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        isDesktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const { isMobile } = context.conditions as { isMobile: boolean; isDesktop: boolean };

        // Hero parallax - desktop only, it reads as jank on touch scrolling.
        if (!isMobile && heroRef.current) {
          gsap.to(heroRef.current, {
            yPercent: 20,
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }

        // Méthode: timeline rail draws down the left on mobile, cards land per waypoint.
        if (stepsRef.current) {
          const items = gsap.utils.toArray<HTMLElement>("[data-step-item]", stepsRef.current);

          if (isMobile) {
            if (railRef.current) {
              gsap.fromTo(
                railRef.current,
                { scaleY: 0 },
                {
                  scaleY: 1,
                  ease: "none",
                  scrollTrigger: {
                    trigger: stepsRef.current,
                    start: "top 75%",
                    end: "bottom 75%",
                    scrub: true,
                  },
                }
              );
            }

            items.forEach((item) => {
              const dot = item.querySelector("[data-step-dot]");
              gsap.fromTo(
                item,
                { opacity: 0, x: 28 },
                {
                  opacity: 1,
                  x: 0,
                  duration: 0.55,
                  ease: "power3.out",
                  scrollTrigger: { trigger: item, start: "top 88%", toggleActions: "play none none none" },
                }
              );
              if (dot) {
                gsap.fromTo(
                  dot,
                  { scale: 0 },
                  {
                    scale: 1,
                    duration: 0.4,
                    ease: "back.out(3)",
                    scrollTrigger: { trigger: item, start: "top 88%", toggleActions: "play none none none" },
                  }
                );
              }
            });
          } else {
            gsap.fromTo(
              items,
              { opacity: 0, y: 60, scale: 0.95 },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: stepsRef.current,
                  start: "top 82%",
                  toggleActions: "play none none none",
                },
              }
            );
          }
        }
      }
    );

    // Reduced motion: nothing animates, so make sure nothing stays hidden.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set("[data-step-item], [data-step-dot]", { opacity: 1, scale: 1 });
    });

    return () => mm.revert();
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-cream py-[90px] pb-[70px] overflow-hidden relative">
        <div ref={heroRef} className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="blur-in" duration={0.6}>
            <span className="inline-block text-bronze-light text-xs font-semibold tracking-[2px] uppercase mb-[22px]">
              Votre patrimoine, notre engagement
            </span>
          </AnimateIn>
          <DrawLine className="w-[44px] h-px bg-bronze mb-6" delay={200} />
          <SplitHeading
            text="Le conseil qui structure l'ensemble de votre patrimoine."
            className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.22] font-medium text-cream max-w-[680px]"
            delay={300}
          />
          <AnimateIn variant="fade-up" delay={500} duration={0.7}>
            <p className="text-[16px] text-[#D8CDBC] max-w-[560px] mt-5 mb-[30px] leading-[1.75]">
              Horkos centralise vos besoins patrimoniaux et s&apos;appuie sur un réseau de professionnels pour construire une stratégie d&apos;investissement cohérente.
            </p>
          </AnimateIn>
          <AnimateIn variant="fade-up" delay={650}>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/rendez-vous"
                className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
              >
                Prendre rendez-vous
              </Link>
              <Link
                href="/cabinet/approche"
                className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-transparent text-cream border border-cream/40 hover:bg-cream/10 transition-colors rounded-lg"
              >
                Comprendre notre approche
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Besoins */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-right" mobileVariant="fade-up">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Votre point de départ
            </span>
          </AnimateIn>
          <SplitHeading
            text="Nous partons de vos besoins, jamais de nos produits."
            as="h2"
            className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-2.5 max-w-[680px]"
            delay={100}
          />
          <AnimateIn variant="fade-up" delay={200}>
            <p className="text-warm-grey text-[14.5px] max-w-[640px] mb-[34px] leading-[1.65]">
              Avant toute recommandation, nous identifions précisément ce que vous cherchez à accomplir.
            </p>
          </AnimateIn>
          <AnimateIn variant="fade-up" delay={250}>
            <RowLabel>Pour vous</RowLabel>
          </AnimateIn>

          {/* Dans le conteneur, pas en pleine largeur : au-delà, un grand écran
              affiche les six besoins d'un coup et la rangée n'a plus rien à
              faire défiler. Bornée à 1200px, quatre cartes sont visibles et les
              deux autres restent à découvrir. */}
          <MarqueeRow
            direction="left"
            items={besoinsParticuliers.map((b) => (
              <BesoinCard key={b.title} {...b} />
            ))}
          />
          {/* Only two cards here, so a marquee would be more motion than content.
              They sit centred instead. */}
          <AnimateIn variant="fade-up" delay={100}>
            <RowLabel className="mt-12">
              Pour votre entreprise
            </RowLabel>
          </AnimateIn>
          <div className="flex flex-wrap justify-center gap-3.5">
            {besoinsEntreprises.map((b, i) => (
              <AnimateIn
                key={b.title}
                variant="reveal-up"
                delay={i * 130}
                className="w-[260px] sm:w-[300px]"
              >
                <BesoinCard {...b} />
              </AnimateIn>
            ))}
          </div>

          <AnimateIn variant="fade-up" delay={400}>
            <div className="mt-[34px] text-center">
              <Link
                href="/rendez-vous"
                className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
              >
                Identifier mon besoin →
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-16 bg-cream-deep overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-right" mobileVariant="fade-up">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Comment ça marche
            </span>
          </AnimateIn>
          <SplitHeading
            text="Trois étapes, un seul objectif : que vous compreniez avant de décider"
            as="h2"
            className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-2.5 max-w-[680px]"
            delay={100}
          />

          <div ref={stepsRef} className="relative mt-8">
            {/* Mobile-only timeline rail */}
            <div
              ref={railRef}
              className="md:hidden absolute left-[9px] top-3 bottom-3 w-px bg-bronze/40 origin-top"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-8 md:pl-0">
              {steps.map((s, i) => (
                <div key={s.n} data-step-item className="relative" style={{ opacity: 0 }}>
                  <span
                    data-step-dot
                    className="md:hidden absolute -left-[29px] top-3.5 w-[13px] h-[13px] rounded-full bg-bronze ring-4 ring-cream-deep"
                  />
                  <div className="bg-white border border-cream-deep p-[26px] rounded-lg h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <AnimatedCounter
                      value={s.n}
                      className="font-heading text-[28px] text-bronze font-medium mb-3 block"
                      delay={i * 150 + 300}
                    />
                    <h3 className="text-[16px] font-semibold mb-2">{s.title}</h3>
                    <p className="text-[13.5px] text-warm-grey leading-[1.6]">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Relation / Fondateur */}
      <section className="py-16 bg-ink text-cream overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-[60px] items-center">
          <div>
            <AnimateIn variant="fade-right" mobileVariant="fade-up">
              <span className="text-bronze-light text-[11.5px] font-semibold tracking-[1.8px] uppercase">
                L&apos;équipe
              </span>
            </AnimateIn>
            <SplitHeading
              text="Vous ne créez pas un espace client, vous créez une relation de confiance."
              as="h2"
              className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-2.5 text-cream max-w-[680px]"
              delay={100}
            />
            <AnimateIn variant="fade-up" delay={300}>
              <p className="text-[#D8CDBC] text-[15px] leading-[1.75] max-w-[480px]">
                Ce qui fait la différence, ce n&apos;est pas un algorithme ni un catalogue de produits. C&apos;est la personne qui prend le temps de comprendre votre besoin, de mobiliser les bons experts, et de rester à vos côtés.
              </p>
            </AnimateIn>
            <AnimateIn variant="fade-left" mobileVariant="reveal-up" delay={450}>
              <div className="mt-6 max-w-[480px] bg-cream/[0.06] border-l-2 border-bronze-light px-[26px] py-[22px] font-heading italic text-[19px] text-cream leading-[1.5]">
                &quot;La gestion de patrimoine ne manque pas de produits. Elle manque de conseil. Chez Horkos, rien n&apos;est recommandé avant d&apos;être compris.&quot;
              </div>
            </AnimateIn>
          </div>
          <AnimateIn variant="scale-in" mobileVariant="reveal-up" delay={200}>
            <div className="bg-cream/[0.06] border border-cream/[0.14] p-8 rounded-lg">
              <div className="flex items-center gap-3 mb-1">
                <Image
                  src="/images/fondateur.jpg"
                  alt="Othmane Benzakour"
                  width={52}
                  height={52}
                  className="w-[52px] h-[52px] rounded-full object-cover object-[center_15%]"
                />
                <a
                  href="https://www.linkedin.com/in/othmane-benzakour-6a93a0112/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-[26px] h-[26px] rounded bg-cream/[0.12] flex items-center justify-center text-xs font-bold text-cream hover:bg-cream/[0.2] transition-colors"
                >
                  in
                </a>
              </div>
              <h4 className="font-heading text-cream text-[19px] mt-2">Othmane Benzakour</h4>
              <div className="text-bronze-light text-[11px] tracking-[1.5px] uppercase mt-1">
                Fondateur &amp; CEO
              </div>
              <p className="text-[14px] text-[#D8CDBC] mt-3.5 leading-[1.65]">
                Othmane a construit son expertise patrimoniale en France avant de fonder Horkos au Maroc - une double culture qu&apos;il met directement au service de ses clients, ici et à l&apos;étranger.
              </p>
              <p className="text-[14px] text-[#D8CDBC] mt-3.5 leading-[1.65]">
                Sa conviction : aucune recommandation avant la compréhension. Chaque client structure son patrimoine et décide en toute clarté.
              </p>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* MRE - Double regard */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7 grid grid-cols-1 lg:grid-cols-2 gap-[50px] items-center">
          <div>
            <AnimateIn variant="fade-right" mobileVariant="fade-up">
              <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
                Marocains résidant à l&apos;étranger
              </span>
            </AnimateIn>
            <SplitHeading
              text="Un double regard, Maroc et France."
              as="h2"
              className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-2.5 max-w-[680px]"
              delay={100}
            />
            <AnimateIn variant="fade-up" delay={250}>
              <p className="text-warm-grey text-[14.5px] max-w-[640px] mb-6 leading-[1.65]">
                Gérer un patrimoine entre deux pays, ce n&apos;est pas gérer deux patrimoines séparés. C&apos;est comprendre comment la fiscalité marocaine et la fiscalité française ou européenne s&apos;articulent - et où elles créent des opportunités ou des risques que vous ne verriez pas seul.
              </p>
            </AnimateIn>
            <AnimateIn variant="fade-up" delay={350}>
              <Link
                href="/rendez-vous"
                className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
              >
                Prendre rendez-vous depuis l&apos;étranger →
              </Link>
            </AnimateIn>
          </div>
          <AnimateIn variant="fade-left" mobileVariant="reveal-up" delay={150}>
            <div className="bg-navy text-cream p-[30px] rounded-lg">
              <h4 className="text-cream text-[18px] font-semibold mb-2.5">Pourquoi c&apos;est notre terrain</h4>
              <p className="text-[13.5px] text-[#D8CDBC] leading-[1.6]">
                Othmane, fondateur de Horkos, a construit son expérience patrimoniale en France avant de fonder Horkos. Cette expérience lui permet de comprendre concrètement votre situation si vous résidez en France ou ailleurs en Europe - impôt sur le revenu, prélèvements sociaux, conventions fiscales avec le Maroc - et d&apos;envisager, selon les cas, un accompagnement adapté à votre réalité à l&apos;étranger.
              </p>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Nos solutions */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7 grid grid-cols-1 lg:grid-cols-2 gap-[50px] items-center">
          <div>
            <AnimateIn variant="fade-right" mobileVariant="fade-up">
              <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
                Nos solutions
              </span>
            </AnimateIn>
            <SplitHeading
              text="Des produits, une seule logique : votre stratégie globale."
              as="h2"
              className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-2.5 max-w-[680px]"
              delay={100}
            />
            <AnimateIn variant="fade-up" delay={250}>
              <p className="text-warm-grey text-[14.5px] max-w-[640px] mb-6 leading-[1.65]">
                Une fois votre besoin identifié, nous mobilisons les solutions adaptées - placements financiers, immobilier, private equity, venture capital, art. Jamais l&apos;inverse.
              </p>
            </AnimateIn>
            <AnimateIn variant="fade-up" delay={350}>
              <Link
                href="/cabinet/produits"
                className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
              >
                Découvrir nos produits →
              </Link>
            </AnimateIn>
          </div>
          <AnimateIn variant="fade-left" mobileVariant="reveal-up" delay={150}>
            <div className="bg-navy text-cream p-[30px] rounded-lg">
              <h4 className="text-cream text-[18px] font-semibold mb-2.5">Un réseau derrière chaque recommandation</h4>
              <p className="text-[13.5px] text-[#D8CDBC] leading-[1.6]">
                Sociétés de gestion, assureurs, agents immobiliers, fonds de Private Equity et de Venture Capital : nous mobilisons les bons partenaires pour chaque dossier.
              </p>
              <Link href="/conseil/reseau" className="inline-block mt-4 text-bronze-light text-[12.5px] font-medium hover:text-bronze transition-colors">
                En savoir plus sur notre réseau →
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Structuration patrimoniale */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7 grid grid-cols-1 lg:grid-cols-2 gap-[50px] items-center">
          <div>
            <AnimateIn variant="fade-right" mobileVariant="fade-up">
              <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
                Structuration patrimoniale
              </span>
            </AnimateIn>
            <SplitHeading
              text="Structurer, pas seulement placer."
              as="h2"
              className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-2.5 max-w-[680px]"
              delay={100}
            />
            <AnimateIn variant="fade-up" delay={250}>
              <p className="text-warm-grey text-[14.5px] max-w-[640px] mb-6 leading-[1.65]">
                Création de sociétés patrimoniales, apport de biens immobiliers en nature, gestion comptable déléguée - un conseil de structuration avant toute mise en œuvre par un professionnel du réseau.
              </p>
            </AnimateIn>
            <AnimateIn variant="fade-up" delay={350}>
              <Link
                href="/conseil/structuration"
                className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
              >
                Découvrir la structuration →
              </Link>
            </AnimateIn>
          </div>
          <AnimateIn variant="fade-left" mobileVariant="reveal-up" delay={150}>
            <div className="bg-navy text-cream p-[30px] rounded-lg">
              <h4 className="text-cream text-[18px] font-semibold mb-2.5">Cas d&apos;usage fréquent</h4>
              <p className="text-[13.5px] text-[#D8CDBC] leading-[1.6]">
                Un bien immobilier détenu en nom propre, apporté au capital d&apos;une SARL immobilière, avec un expert-comptable dédié à sa gestion.
              </p>
              <Link href="/conseil/cas-usage" className="inline-block mt-4 text-bronze-light text-[12.5px] font-medium hover:text-bronze transition-colors">
                Voir d&apos;autres cas d&apos;usage →
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-right" mobileVariant="fade-up">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Confiance &amp; confidentialité
            </span>
          </AnimateIn>
          <SplitHeading
            text="Un conseil indépendant, une pédagogie exigeante"
            as="h2"
            className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-6 max-w-[680px]"
            delay={100}
          />

          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-3 gap-[22px]">
            {trustCards.map((t, i) => (
              <AnimateIn key={t.title} variant="rotate-in" delay={i * 120}>
                <TrustCard title={t.title} desc={t.desc} />
              </AnimateIn>
            ))}
          </div>

          {/* Mobile: card deck that stacks as you scroll */}
          <StackCards
            className="md:hidden"
            items={trustCards.map((t) => (
              <TrustCard key={t.title} title={t.title} desc={t.desc} />
            ))}
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-right" mobileVariant="fade-up">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              FAQ
            </span>
          </AnimateIn>
          <SplitHeading
            text="Vos questions, nos réponses"
            as="h2"
            className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mt-2.5 mb-6 max-w-[680px]"
            delay={100}
          />
          <div>
            {faqs.map((faq, i) => (
              <AnimateIn key={i} variant="fade-up" mobileVariant="fade-left" delay={i * 100}>
                <div className="border-t border-cream-deep last:border-b">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between py-[22px] text-left cursor-pointer"
                  >
                    <span className="font-heading text-[17px] font-semibold text-ink">{faq.q}</span>
                    <span
                      className={`text-bronze text-xl transition-transform duration-300 ${
                        openFaq === i ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                    style={{ gridTemplateRows: openFaq === i ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="text-[13.5px] text-warm-grey leading-[1.6] max-w-[680px] pb-[22px]">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
