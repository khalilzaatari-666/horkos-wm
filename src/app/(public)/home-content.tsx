"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, FileText, Lock, MessageSquareText } from "lucide-react";
import gsap from "gsap";
import { AnimateIn } from "@/components/ui/animate-in";
import { TextReveal } from "@/components/public/text-reveal";
import { ImageAccordion } from "@/components/public/image-accordion";
import { PinnedSteps } from "@/components/public/pinned-steps";
import { UiStack } from "@/components/public/ui-stack";
import { NetworkOrbit } from "@/components/public/network-orbit";
import { StackFeatures } from "@/components/public/stack-features";
import { Rail } from "@/components/public/rail";
import { FaqSplit } from "@/components/public/faq-split";
import { CtaBand } from "@/components/public/cta-band";
import { RevealImage } from "@/components/public/reveal-image";
import { FragQuestionnaire, FragReco, FragRevue } from "@/components/public/ui-fragments";
import { besoinsParticuliers, besoinsEntreprises } from "@/lib/besoins";

export interface FaqPublique {
  q: string;
  a: string;
}

export interface Publication {
  kind: "Article" | "Guide";
  title: string;
  desc: string | null;
  href: string;
  cover: string | null;
  category: string | null;
}

/**
 * La FAQ affichée quand la table `faqs` est vide ou illisible.
 *
 * Ce n'est pas un doublon oublié : la section fait partie de l'argumentaire de
 * la page d'accueil, et la laisser disparaître au premier hoquet de la base
 * abîmerait la page. Le cabinet reprend la main dès qu'il publie ses propres
 * questions depuis le back-office.
 */
const FAQS_DE_SECOURS: FaqPublique[] = [
  { q: "Horkos, c’est quoi ?", a: "Un cabinet de conseil en gestion de patrimoine qui centralise vos besoins et s’appuie sur un réseau de professionnels spécialisés." },
  { q: "Est-ce que vous poussez des produits ?", a: "Non. Chaque recommandation part d’un besoin identifié avec vous." },
  { q: "Horkos gère-t-il mon argent directement ?", a: "Non. Horkos formule des recommandations, vous restez seul décisionnaire." },
];

/** Le sélecteur du hero : la même promesse, dite pour chacun des trois publics. */
const PUBLICS = [
  {
    label: "Particulier",
    line: "Diversifier, préparer votre retraite, transmettre : nous partons de ce que vous cherchez à accomplir, jamais de nos produits.",
    cta: { label: "Prendre rendez-vous", href: "/rendez-vous" },
  },
  {
    label: "Dirigeant",
    line: "Patrimoine professionnel et personnel, société patrimoniale, trésorerie d’entreprise : une seule lecture, des arbitrages cohérents.",
    cta: { label: "Prendre rendez-vous", href: "/rendez-vous" },
  },
  {
    label: "Résident à l’étranger",
    line: "Un double regard Maroc et France pour investir au Maroc ou préparer votre retour, entièrement à distance si besoin.",
    cta: { label: "Rendez-vous depuis l’étranger", href: "/rendez-vous" },
  },
];

const ENGAGEMENTS = [
  {
    title: "Rien n’est recommandé avant d’être compris",
    desc: "Chaque recommandation est expliquée dans le détail, jusqu’à ce que vous puissiez la reformuler avec vos propres mots.",
  },
  {
    title: "Confidentialité",
    desc: "Vos informations patrimoniales ne sont jamais partagées sans votre consentement.",
  },
  {
    title: "Rigueur réglementaire",
    desc: "Horkos Wealth Management structure son activité en conformité avec les cadres AMMC et ACAPS.",
  },
];

const FONCTIONS = [
  { icon: MessageSquareText, title: "Vos recommandations", desc: "Expliquées, à étudier à votre rythme." },
  { icon: CalendarDays, title: "Vos rendez-vous", desc: "R0, R1, R2, puis les revues." },
  { icon: Lock, title: "Votre coffre-fort", desc: "Les documents de votre dossier, chiffrés." },
  { icon: FileText, title: "Votre patrimoine", desc: "Sa répartition, suivie avec vous." },
];

function Hero() {
  const [who, setWho] = useState(0);
  // Défilement automatique des publics, interrompu dès que la personne
  // survole ou choisit ; aucun en mouvement réduit.
  const [chose, setChose] = useState(false);
  useEffect(() => {
    if (chose || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setWho((i) => (i + 1) % PUBLICS.length), 4200);
    return () => window.clearInterval(id);
  }, [chose]);
  const cardRef = useRef<HTMLDivElement>(null);

  // La carte de rendez-vous entre une fois, puis reste immobile.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(card, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, delay: 0.7, ease: "expo.out" });
    });
    return () => mm.revert();
  }, []);

  const p = PUBLICS[who];

  return (
    <section className="shell pt-6 pb-14 lg:pt-8 lg:pb-20">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:h-[min(calc(100svh-110px),720px)] lg:min-h-[600px]">
        <div className="flex flex-col justify-center gap-10 lg:py-6">
          <p className="tag self-start">Conseiller en investissements financiers agréé AMMC</p>

          <div>
            {/* Mobile : le fondateur dès le premier écran, en cadrage serré. */}
            <div className="lg:hidden relative mb-8 h-[34svh] min-h-[240px] overflow-hidden rounded-[20px] bg-cream-deep">
              <Image
                src="/images/fondateur.jpg"
                alt="Othmane Benzakour, fondateur de Horkos Wealth Management"
                fill
                priority
                sizes="100vw"
                className="object-cover object-[50%_14%] mix-blend-multiply"
              />
              <p className="absolute left-4 bottom-3 text-[13px] text-ink/75">
                Othmane Benzakour, fondateur
              </p>
            </div>
            <AnimateIn variant="fade-up" duration={1.1}>
              <h1 className="font-heading font-light text-[clamp(2.5rem,4.4vw,4.25rem)] leading-[1.02] tracking-[-0.03em] text-ink max-w-[13ch]">Le conseil qui structure votre patrimoine.</h1>
            </AnimateIn>

            <AnimateIn variant="fade-up" delay={200}>
              {/* Les trois publics en liste verticale sur un filet : l'indicateur
                  encre glisse vers le public actif. La liste défile d'elle-même
                  jusqu'à ce que la personne choisisse. */}
              <div className="mt-10 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10">
                <div
                  role="tablist"
                  aria-label="Vous êtes"
                  aria-orientation="vertical"
                  onMouseEnter={() => setChose(true)}
                  onFocus={() => setChose(true)}
                  className="relative self-start border-l border-ink/15 pl-5"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -left-px top-0 h-9 w-[2px] bg-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ transform: `translateY(${who * 36}px)` }}
                  />
                  {PUBLICS.map((x, i) => (
                    <button
                      key={x.label}
                      role="tab"
                      type="button"
                      aria-selected={who === i}
                      aria-controls="hero-public"
                      onClick={() => {
                        setChose(true);
                        setWho(i);
                      }}
                      className={`block h-9 text-left text-[16px] transition-colors duration-300 ${
                        who === i ? "text-ink" : "text-warm-grey hover:text-ink"
                      }`}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
                {/* Les trois phrases occupent la même cellule : le bloc garde la
                    hauteur de la plus longue, rien ne bouge quand on change de
                    public. Seule l'active est visible et lue. */}
                <div id="hero-public" role="tabpanel" className="grid max-w-[42ch]">
                  {PUBLICS.map((x, i) => (
                    <p
                      key={x.label}
                      aria-hidden={who !== i}
                      className={`lead col-start-1 row-start-1 transition-opacity duration-700 ${
                        who === i ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {x.line}
                    </p>
                  ))}
                </div>
              </div>
            </AnimateIn>

            <AnimateIn variant="fade-up" delay={320}>
              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link href={p.cta.href} className="btn btn-ink">
                  {p.cta.label}
                </Link>
                <Link href="/cabinet/approche" className="link-arrow">
                  Comprendre notre approche <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </AnimateIn>
          </div>

        </div>

        <RevealImage
          src="/images/fondateur.jpg"
          alt="Othmane Benzakour, fondateur de Horkos Wealth Management"
          priority
          position="50% 16%"
          sizes="(min-width: 1024px) 55vw, 100vw"
          imageClassName="mix-blend-multiply scale-[1.12] origin-top"
          className="hidden lg:block lg:h-full"
        >
          <div
            ref={cardRef}
            className="glass absolute left-4 right-4 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[330px] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-[22px] leading-snug text-ink">Audit patrimonial</p>
              <span className="text-[13.5px] font-medium text-ink">Gratuit</span>
            </div>
            <p className="mt-1 text-[13.5px] text-charcoal">Premier échange (R0), sans engagement · en visio ou au cabinet</p>
            <Link href="/rendez-vous" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink">
              Choisir un créneau <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <p className="absolute left-6 top-6 hidden sm:block text-[13px] text-ink/70">
            Othmane Benzakour - Fondateur
          </p>
        </RevealImage>
      </div>
    </section>
  );
}

function PublicationCard({ p }: { p: Publication }) {
  return (
    <Link href={p.href} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-cream-deep">
        {p.cover ? (
          <Image
            src={p.cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, 80vw"
            className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <Image
            src="/images/editorial/lumiere.jpg"
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, 80vw"
            className="object-cover opacity-90 transition-transform duration-[1.2s] group-hover:scale-[1.04]"
          />
        )}
      </div>
      <div className="mt-5 flex items-center gap-2 text-[13px] text-warm-grey">
        <span className="text-ink">{p.kind}</span>
        {p.category && (
          <>
            <span aria-hidden="true">·</span>
            <span>{p.category}</span>
          </>
        )}
      </div>
      <h3 className="mt-2 font-heading text-[24px] leading-[1.15] text-ink group-hover:underline decoration-1 underline-offset-4">
        {p.title}
      </h3>
      {p.desc && <p className="mt-2 text-[15px] leading-relaxed text-warm-grey line-clamp-2">{p.desc}</p>}
    </Link>
  );
}

export function HomeContent({
  faqs = FAQS_DE_SECOURS,
  publications = [],
}: {
  faqs?: FaqPublique[];
  publications?: Publication[];
}) {
  return (
    <>
      <Hero />

      {/* Manifeste */}
      <section className="shell section-y">
        <div>
          <TextReveal
            as="h2"
            text="La gestion de patrimoine ne manque pas de produits. Elle manque de conseil. Chez Horkos, rien n’est recommandé avant d’être compris."
            className="mx-auto max-w-[22ch] font-heading text-[clamp(2.2rem,4.6vw,4rem)] font-light leading-[1.06] tracking-[-0.025em] text-ink"
          />
        </div>
      </section>

      {/* Besoins */}
      <section>
        <div className="shell section-y">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end mb-10 lg:mb-12">
          <h2 className="display-lg text-ink max-w-[14ch]">Nous partons de vos besoins.</h2>
          <p className="lead max-w-[46ch] lg:justify-self-end">
            Avant toute recommandation, nous identifions précisément ce que vous cherchez à accomplir.
          </p>
        </div>
        <ImageAccordion
          tabs={[
            {
              label: "Pour vous",
              items: besoinsParticuliers.map((b) => ({
                title: b.title,
                desc: b.desc,
                image: b.image,
                href: "/rendez-vous",
                linkLabel: "En parler lors d’un premier échange",
              })),
            },
            {
              label: "Pour votre entreprise",
              items: besoinsEntreprises.map((b) => ({
                title: b.title,
                desc: b.desc,
                image: b.image,
                href: b.href,
                linkLabel: "Voir les solutions entreprises",
              })),
            },
          ]}
        />
        </div>
      </section>

      {/* Méthode */}
      <PinnedSteps
        intro={
          <>
            <h2 className="display-lg text-ink">Trois rendez-vous, un seul objectif.</h2>
            <p className="lead mt-6 max-w-[38ch]">Que vous compreniez avant de décider. Chaque étape a son nom, son contenu et son livrable.</p>
            <Link href="/cabinet/approche" className="link-arrow mt-8">
              Notre approche en détail <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </>
        }
        steps={[
          {
            mark: "R0",
            title: "Comprendre votre situation",
            desc: "Un premier échange, puis un audit patrimonial qui sert de socle : actifs, structure, objectifs. Gratuit et sans engagement.",
            fragment: <FragQuestionnaire />,
          },
          {
            mark: "R1",
            title: "Construire votre stratégie",
            desc: "Des recommandations sur mesure, chacune expliquée jusqu’à ce que vous puissiez la reformuler, frais détaillés.",
            fragment: <FragReco />,
          },
          {
            mark: "R2",
            title: "Suivre dans la durée",
            desc: "Une fois la stratégie mise en œuvre, nous restons impliqués : gouvernance, reporting périodique et arbitrages.",
            fragment: <FragRevue />,
          },
        ]}
      />

      {/* Espace client */}
      <section>
        <div className="shell section-y">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:items-center">
          <div>
            <h2 className="display-lg text-ink max-w-[13ch]">Votre dossier, lisible à tout moment.</h2>
            <p className="lead mt-6 max-w-[44ch]">
              Chaque client dispose d’un espace sécurisé : l’avancement de son accompagnement, ses
              recommandations, ses documents et ses rendez-vous, au même endroit.
            </p>
            <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {FONCTIONS.map((f) => (
                <li key={f.title} className="border-t border-ink/10 pt-5">
                  <f.icon className="size-5 text-ink" aria-hidden="true" strokeWidth={1.5} />
                  <p className="mt-3 text-[16px] font-medium text-ink">{f.title}</p>
                  <p className="mt-1 text-[15px] text-warm-grey">{f.desc}</p>
                </li>
              ))}
            </ul>
          </div>
          <UiStack />
        </div>
        </div>
      </section>

      {/* Réseau */}
      <section className="bg-ink text-cream">
        <div className="shell section-y">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end mb-14 lg:mb-20">
            <h2 className="display-lg text-cream max-w-[12ch]">Le réseau est l’offre.</h2>
            <div className="lg:justify-self-end max-w-[46ch]">
              <p className="text-[18px] leading-relaxed text-cream-muted">
                Horkos est votre point d’entrée unique. Nous coordonnons les professionnels utiles à votre
                dossier, pour que vous n’ayez pas à les consulter un par un, sans vision d’ensemble.
              </p>
              <Link href="/conseil/reseau" className="link-arrow mt-6 text-cream">
                Découvrir notre réseau <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <NetworkOrbit />
        </div>
      </section>

      {/* Fondateur */}
      <section className="section-y overflow-hidden">
        <div className="shell grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-20 lg:items-center">
          <RevealImage
            src="/images/fondateur.jpg"
            alt="Othmane Benzakour"
            position="50% 8%"
            sizes="(min-width: 1024px) 40vw, 100vw"
            imageClassName="mix-blend-multiply"
            className="aspect-[4/5] lg:aspect-auto lg:h-[min(560px,70vh)] lg:-ml-[max(40px,calc((100vw-1320px)/2+40px))] lg:rounded-l-none"
          />
          <div>
            <blockquote className="font-heading font-light italic text-[clamp(1.5rem,2.4vw,2.1rem)] leading-[1.2] tracking-[-0.015em] text-ink">
              « Ce qui fait la différence, ce n’est pas un algorithme ni un catalogue de produits. C’est la
              personne qui prend le temps de comprendre votre besoin, de mobiliser les bons experts, et de rester à
              vos côtés. »
            </blockquote>
            <div className="mt-10 flex items-center gap-4 border-t border-ink/10 pt-6">
              <div>
                <p className="text-[17px] font-medium text-ink">Othmane Benzakour</p>
                <p className="text-[15px] text-warm-grey">Fondateur</p>
              </div>
              <a
                href="https://www.linkedin.com/in/othmane-benzakour-6a93a0112/"
                target="_blank"
                rel="noopener noreferrer"
                className="link-arrow ml-auto text-[15px]"
              >
                LinkedIn <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <p className="text-[16px] leading-relaxed text-charcoal">
                Othmane a construit son expertise patrimoniale en France avant de fonder Horkos au Maroc : une double
                culture qu’il met au service de ses clients, ici et à l’étranger.
              </p>
              <p className="text-[16px] leading-relaxed text-charcoal">
                Sa conviction : aucune recommandation avant la compréhension. Chaque client structure son patrimoine et
                décide en toute clarté.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Terrains : cartes photographiques empilées */}
      <section className="shell pb-16 lg:pb-24">
        <h2 className="display-lg mb-10 max-w-[16ch] text-ink lg:mb-12">Là où notre conseil fait la différence.</h2>
        <StackFeatures
          items={[
            {
              title: "Un double regard, Maroc et France",
              desc: "Gérer un patrimoine entre deux pays, ce n’est pas gérer deux patrimoines séparés : c’est comprendre comment les fiscalités s’articulent, et où elles créent des opportunités ou des risques.",
              href: "/rendez-vous",
              linkLabel: "Prendre rendez-vous depuis l’étranger",
              image: "/images/stack/double-regard.jpg",
            },
            {
              title: "Structurer, pas seulement placer",
              desc: "Sociétés patrimoniales, apports en nature, gestion comptable déléguée : un conseil de structuration avant toute mise en œuvre par un professionnel du réseau.",
              href: "/conseil/structuration",
              linkLabel: "Découvrir la structuration",
              image: "/images/stack/structurer.jpg",
            },
            {
              title: "Une rémunération annoncée avant",
              desc: "Le premier diagnostic est gratuit. Ensuite, notre rémunération est annoncée avant toute mise en œuvre, jamais deux catégories de frais sur le même besoin.",
              href: "/cabinet/modele",
              linkLabel: "Notre modèle de rémunération",
              image: "/images/stack/remuneration.jpg",
              facts: [
                ["Diagnostic", "Gratuit"],
                ["Investissement", "Commissions"],
                ["Conseil seul", "Honoraires"],
              ],
            },
          ]}
        />
      </section>

      {/* Engagements */}
      <section className="shell">
        <div className="section-y grid gap-12 border-t border-ink/10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2 className="display-lg max-w-[14ch] text-ink">Un conseil indépendant, une pédagogie exigeante.</h2>
            <p className="lead mt-6 max-w-[40ch]">
              Trois engagements tiennent chaque accompagnement, du premier échange au suivi dans la durée.
            </p>
            <Link href="/cabinet/approche" className="btn btn-ink btn-sm mt-8">
              Notre approche
            </Link>
          </div>
          <ul className="space-y-4">
            {ENGAGEMENTS.map((e) => (
              <li key={e.title} className="rounded-[12px] border border-ink/10 p-7 lg:p-9">
                <h3 className="display-sm text-ink">{e.title}</h3>
                <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-charcoal">{e.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Ressources */}
      {publications.length > 0 && (
        <section>
          <div className="shell section-y">
          <Rail
            label="Dernières publications"
            header={
              <div>
                <h2 className="display-lg text-ink">À lire avant un rendez-vous.</h2>
                <Link href="/ressources/articles" className="link-arrow mt-5">
                  Toutes nos ressources <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            }
          >
            {publications.map((p) => (
              <PublicationCard key={p.href + p.title} p={p} />
            ))}
          </Rail>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="shell">
        <div className="section-y border-t border-ink/10">
          <FaqSplit items={faqs} />
        </div>
      </section>

      <CtaBand title="Commençons par un premier échange." label="Prendre rendez-vous" />
    </>
  );
}
