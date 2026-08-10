"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";
import { DrawLine } from "@/components/ui/draw-line";
import { SwipeRow } from "@/components/ui/swipe-row";
import { AssetForm } from "@/components/public/asset-form";

interface Product {
  title: string;
  oneline: string;
  detail: string;
}

interface Category {
  name: string;
  count: string;
  products: Product[];
}

const individuelles: Category[] = [
  {
    name: "Placements financiers",
    count: "4 solutions",
    products: [
      {
        title: "Assurance-vie multisupport",
        oneline: "Épargne long terme avec fonds garanti + unités de compte.",
        detail: "Contrat combinant un fonds en dirhams à capital garanti et des unités de compte plus dynamiques. Utile pour se constituer une épargne, préparer une transmission (le capital sort hors succession) ou lisser une fiscalité dans la durée. Horizon recommandé : 5 ans et plus.",
      },
      {
        title: "PER - Plan d'Épargne Retraite",
        oneline: "Épargne bloquée jusqu'à la retraite, avantage fiscal à l'entrée.",
        detail: "Les versements réduisent votre revenu imposable chaque année. En contrepartie, l'épargne reste bloquée jusqu'au départ à la retraite (sauf cas de déblocage anticipé : achat de résidence principale, invalidité...). Adapté aux revenus élevés qui veulent lisser leur fiscalité sur le long terme.",
      },
      {
        title: "PEA - Plan d'Épargne en Actions",
        oneline: "Enveloppe actions avec fiscalité allégée après quelques années.",
        detail: "Permet d'investir en actions (marocaines ou éligibles) avec une fiscalité avantageuse sur les plus-values passé un certain délai de détention. Adapté à un profil qui accepte la volatilité des marchés actions pour viser une performance supérieure sur le long terme.",
      },
      {
        title: "OPCVM en détention directe",
        oneline: "Fonds d'investissement détenus directement, sans enveloppe.",
        detail: "Achat direct de parts de fonds actions, obligataires ou diversifiés, sans passer par un contrat d'assurance-vie. Plus de souplesse (liquidité, pas de durée minimale imposée), fiscalité standard sur les plus-values. Utile pour du placement à moyen terme sans contrainte de blocage.",
      },
    ],
  },
  {
    name: "Immobilier",
    count: "4 solutions",
    products: [
      {
        title: "Locaux commerciaux - rendement locatif",
        oneline: "Acquisition de commerces loués pour un revenu régulier.",
        detail: "Investissement dans des locaux commerciaux déjà loués ou à louer (boutiques, bureaux), générant un loyer mensuel. Nous sélectionnons l'emplacement, le locataire et structurons l'acquisition (nom propre ou société) avec notre réseau de professionnels.",
      },
      {
        title: "Club deals immobiliers",
        oneline: "Co-investissement à plusieurs sur un actif immobilier ciblé.",
        detail: "Plusieurs investisseurs mettent en commun leurs fonds pour acquérir un actif immobilier de plus grande taille (immeuble, résidence) qu'ils ne pourraient financer seuls. Ticket d'entrée réduit, gestion mutualisée, sortie généralement à moyen terme.",
      },
      {
        title: "Hôtellerie",
        oneline: "Participation dans des actifs hôteliers ou parahôteliers.",
        detail: "Investissement dans des unités hôtelières ou résidences de tourisme, exploitées par un opérateur professionnel. Revenu indexé sur la performance de l'exploitation ou loyer garanti selon le montage. Horizon moyen-long terme.",
      },
      {
        title: "Promotion immobilière",
        oneline: "Financement de programmes immobiliers en développement.",
        detail: "Participation au financement d'un programme immobilier porté par un promoteur partenaire - résidentiel ou mixte. Rendement potentiellement plus élevé, en contrepartie d'un risque projet (délais, commercialisation) propre à la promotion.",
      },
    ],
  },
  {
    name: "Private Equity",
    count: "1 solution",
    products: [
      {
        title: "Prises de participation PE",
        oneline: "Investissement au capital d'entreprises non cotées en croissance.",
        detail: "Prise de participation minoritaire dans des sociétés marocaines établies, en phase de croissance ou de transmission. Horizon long (5-8 ans), liquidité réduite, rendement visé supérieur aux placements traditionnels. Réservé aux patrimoines diversifiés pouvant immobiliser une partie de leurs actifs.",
      },
    ],
  },
  {
    name: "Venture Capital",
    count: "1 solution",
    products: [
      {
        title: "Investissement dans des startups",
        oneline: "Tickets d'investissement dans de jeunes entreprises innovantes.",
        detail: "Participation à des levées de fonds de startups marocaines ou régionales sélectionnées avec des fonds VC partenaires. Risque élevé, horizon long, rendement potentiel important mais non garanti - réservé à une part limitée du patrimoine.",
      },
    ],
  },
  {
    name: "Art",
    count: "1 solution",
    products: [
      {
        title: "Acquisition d'œuvres d'art",
        oneline: "Diversification patrimoniale par l'acquisition d'œuvres sélectionnées.",
        detail: "Accompagnement dans l'acquisition d'œuvres d'artistes marocains et internationaux, en lien avec des experts et galeries partenaires - authentification, valorisation et conservation. Diversification hors marchés financiers, plaisir patrimonial autant que placement.",
      },
    ],
  },
];

const entreprises: Category[] = [
  {
    name: "Épargne Salariale",
    count: "2 solutions",
    products: [
      {
        title: "PER Collectif - allocation selon profil de risque",
        oneline: "Un PER d'entreprise géré selon le profil de chaque collaborateur.",
        detail: "Nous mettons en place un Plan d'Épargne Retraite collectif pour vos salariés, avec une allocation ajustée au profil de risque de chacun plutôt qu'une gestion uniforme - pour améliorer le rendement de leur épargne sans complexifier votre gestion RH. Un outil de fidélisation concret, au-delà du salaire.",
      },
      {
        title: "Accompagnement et pédagogie collaborateurs",
        oneline: "Des sessions dédiées pour que vos équipes comprennent leur épargne.",
        detail: "Nous organisons des sessions d'explication pour vos collaborateurs - comment fonctionne leur PER, comment choisir leur allocation, quels avantages fiscaux. Une épargne bien comprise est une épargne qui fidélise davantage.",
      },
    ],
  },
  {
    name: "Trésorerie d'entreprise",
    count: "1 solution",
    products: [
      {
        title: "Placement de trésorerie excédentaire",
        oneline: "Faire fructifier une trésorerie d'entreprise sans l'immobiliser.",
        detail: "Stratégie combinant produits liquides et produits de rendement pour une trésorerie d'entreprise excédentaire, structurée selon votre besoin de disponibilité des fonds. Objectif : ne pas laisser dormir une trésorerie qui pourrait travailler, sans compromettre la capacité opérationnelle de l'entreprise.",
      },
    ],
  },
];

interface ProductCardProps {
  product: Product;
  variant?: "cream" | "white";
  /** Reserves two lines for title and summary so siblings collapse to equal heights. */
  uniform?: boolean;
  /** Omit both to let the card own its state; pass both to hoist it to the parent. */
  open?: boolean;
  onToggle?: () => void;
}

function ProductCard({
  product,
  variant = "cream",
  uniform = false,
  open: openProp,
  onToggle,
}: ProductCardProps) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;

  return (
    <div
      className={`rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border ${variant === "cream" ? "bg-cream border-cream-deep hover:border-bronze/30" : "bg-white border-ink/[0.08] hover:border-bronze/30"}`}
      onClick={() => (isControlled ? onToggle?.() : setOpenState(!openState))}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex-1 min-w-0 mr-4">
          <h4
            className={`text-[15px] font-semibold leading-[1.35] ${
              uniform ? "line-clamp-2 min-h-[2.7em]" : ""
            }`}
          >
            {product.title}
          </h4>
          <p
            className={`text-[13px] text-warm-grey mt-0.5 leading-[1.5] ${
              uniform ? "line-clamp-2 min-h-[3em]" : ""
            }`}
          >
            {product.oneline}
          </p>
        </div>
        <span
          className={`text-bronze text-[18px] transition-transform duration-300 flex-shrink-0 ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-4 pt-0">
            <div className="border-t border-ink/[0.06] pt-3">
              <p className="text-[14px] text-warm-grey leading-[1.7]">{product.detail}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryBlock({ category, delay, variant = "cream" }: { category: Category; delay: number; variant?: "cream" | "white" }) {
  return (
    <div className="mb-10">
      <AnimateIn variant="fade-right" delay={delay}>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-[18px] font-semibold">{category.name}</h3>
          <span className="text-[12px] text-warm-grey font-medium">{category.count}</span>
        </div>
      </AnimateIn>
      <div className="grid md:grid-cols-2 gap-3">
        {category.products.map((p, i) => (
          <AnimateIn key={p.title} variant="scale-in" delay={delay + (i * 80)}>
            <ProductCard product={p} variant={variant} />
          </AnimateIn>
        ))}
      </div>
    </div>
  );
}

/**
 * One category as a swipeable row. The open card is tracked here rather than
 * inside each card: a flex row is as tall as its tallest child, so a card left
 * expanded off-screen would keep the whole row inflated after you close another.
 */
function SwipeCategory({ category, variant }: { category: Category; variant: "cream" | "white" }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="mb-10">
      <AnimateIn variant="fade-up">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-[18px] font-semibold">{category.name}</h3>
          <span className="text-[12px] text-warm-grey font-medium">{category.count}</span>
        </div>
      </AnimateIn>
      <SwipeRow
        className="-mx-7"
        items={category.products.map((p, i) => (
          <ProductCard
            key={p.title}
            product={p}
            variant={variant}
            uniform
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? null : i)}
          />
        ))}
      />
    </div>
  );
}

/** Mobile: category heading + a swipeable row of that category's products. */
function CategorySwipe({ categories, variant }: { categories: Category[]; variant: "cream" | "white" }) {
  return (
    <div className="md:hidden">
      {categories.map((cat) => (
        <SwipeCategory key={cat.name} category={cat} variant={variant} />
      ))}
    </div>
  );
}

export default function ProduitsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-cream pt-[50px] pb-[36px] overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="blur-in" duration={0.5}>
            <span className="inline-block bg-cream/[0.08] border border-cream/[0.18] text-bronze-light text-[11px] font-semibold tracking-[1.5px] uppercase px-3.5 py-1.5 mb-4">
              Notre gamme
            </span>
          </AnimateIn>
          <SplitHeading
            text="Des produits, présentés clairement."
            className="text-[clamp(1.6rem,4vw,1.875rem)] font-medium text-cream max-w-[660px] leading-[1.3]"
            delay={200}
          />
          <AnimateIn variant="fade-up" delay={400}>
            <p className="text-[#D8CDBC] max-w-[620px] mt-3.5 text-[14.5px] leading-[1.7]">
              Cliquez sur une solution pour comprendre à quoi elle sert, sans jargon. Chaque recommandation reste choisie pour votre situation.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Solutions individuelles */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-right">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Pour vous
            </span>
          </AnimateIn>
          <SplitHeading
            text="Solutions individuelles"
            as="h2"
            className="text-[clamp(1.4rem,3.5vw,1.7rem)] font-semibold mt-2.5 mb-8"
            delay={100}
          />

          {/* Desktop: full catalogue, grouped by category */}
          <div className="hidden md:block">
            {individuelles.map((cat, i) => (
              <CategoryBlock key={cat.name} category={cat} delay={i * 80} variant="cream" />
            ))}
          </div>

          {/* Mobile: one swipeable row per category */}
          <CategorySwipe categories={individuelles} variant="cream" />
        </div>
      </section>

      {/* Solutions entreprises */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn variant="fade-right">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Pour votre entreprise
            </span>
          </AnimateIn>
          <SplitHeading
            text="Solutions entreprises"
            as="h2"
            className="text-[clamp(1.4rem,3.5vw,1.7rem)] font-semibold mt-2.5 mb-4"
            delay={100}
          />
          <AnimateIn variant="fade-up" delay={200}>
            <p className="text-[14.5px] text-warm-grey max-w-[620px] leading-[1.7] mb-8">
              Fidéliser vos collaborateurs, faire fructifier votre trésorerie : nous accompagnons aussi les dirigeants, pas seulement les particuliers.
            </p>
          </AnimateIn>

          <AnimateIn variant="fade-left">
            <div className="bg-cream-deep/60 border-l-2 border-bronze-light rounded-r-lg p-5 mb-10 text-[14.5px] text-charcoal leading-[1.7] max-w-[700px]">
              &quot;Vous êtes chef d&apos;entreprise et cherchez à fidéliser vos équipes tout en développant le rendement de la poche fiscale PER de vos collaborateurs ? Nous avons la solution.&quot;
            </div>
          </AnimateIn>

          {/* Desktop: full catalogue, grouped by category */}
          <div className="hidden md:block">
            {entreprises.map((cat, i) => (
              <CategoryBlock key={cat.name} category={cat} delay={i * 80} variant="white" />
            ))}
          </div>

          {/* Mobile: same swipe rows, kept consistent with the section above */}
          <CategorySwipe categories={entreprises} variant="white" />
        </div>
      </section>

      {/* Céder un actif */}
      <section className="py-16 bg-white overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-7">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <AnimateIn variant="fade-right">
                <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
                  Céder un actif
                </span>
              </AnimateIn>
              <SplitHeading
                text="Un actif à céder ?"
                as="h2"
                className="text-[clamp(1.4rem,3.5vw,1.7rem)] font-semibold mt-2.5 mb-4"
                delay={100}
              />
              <AnimateIn variant="fade-up" delay={250}>
                <p className="text-[14.5px] text-warm-grey leading-[1.7] max-w-[480px]">
                  Bien immobilier, entreprise, participation, œuvre d&apos;art… décrivez l&apos;actif que vous souhaitez céder. Notre équipe l&apos;étudie et le présente de façon sélective aux clients pour qui il est pertinent.
                </p>
              </AnimateIn>
            </div>

            <AnimateIn variant="fade-left" delay={150}>
              <AssetForm />
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-cream-deep border-t border-ink/[0.06]">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <DrawLine className="w-16 h-px bg-bronze mx-auto mb-6" direction="center" />
          <AnimateIn variant="scale-in">
            <h2 className="text-[clamp(1.4rem,3.5vw,1.7rem)] font-semibold mx-auto max-w-[680px]">
              Une solution retient votre attention ?
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
