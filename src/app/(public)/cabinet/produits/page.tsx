"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { AssetForm } from "@/components/public/asset-form";
import { HashScroll } from "@/components/ui/hash-scroll";
import { PageHero } from "@/components/public/page-hero";
import { CtaBand } from "@/components/public/cta-band";
import { AnimateIn } from "@/components/ui/animate-in";

interface Product {
  title: string;
  oneline: string;
  detail: string;
}

interface Category {
  name: string;
  count: string;
  image: string;
  products: Product[];
}

const individuelles: Category[] = [
  {
    name: "Placements financiers",
    image: "/images/pages/placements.jpg",
    count: "4 solutions",
    products: [
      {
        title: "Assurance-vie multisupport",
        oneline: "Épargne long terme avec fonds garanti + unités de compte.",
        detail: "Contrat combinant un fonds en dirhams à capital garanti et des unités de compte plus dynamiques. Utile pour se constituer une épargne, préparer une transmission (le capital sort hors succession) ou lisser une fiscalité dans la durée. Horizon recommandé : 5 ans et plus.",
      },
      {
        title: "PER - Plan d’Épargne Retraite",
        oneline: "Épargne bloquée jusqu’à la retraite, avantage fiscal à l’entrée.",
        detail: "Les versements réduisent votre revenu imposable chaque année. En contrepartie, l’épargne reste bloquée jusqu’au départ à la retraite (sauf cas de déblocage anticipé : achat de résidence principale, invalidité...). Adapté aux revenus élevés qui veulent lisser leur fiscalité sur le long terme.",
      },
      {
        title: "PEA - Plan d’Épargne en Actions",
        oneline: "Enveloppe actions avec fiscalité allégée après quelques années.",
        detail: "Permet d’investir en actions (marocaines ou éligibles) avec une fiscalité avantageuse sur les plus-values passé un certain délai de détention. Adapté à un profil qui accepte la volatilité des marchés actions pour viser une performance supérieure sur le long terme.",
      },
      {
        title: "OPCVM en détention directe",
        oneline: "Fonds d’investissement détenus directement, sans enveloppe.",
        detail: "Achat direct de parts de fonds actions, obligataires ou diversifiés, sans passer par un contrat d’assurance-vie. Plus de souplesse (liquidité, pas de durée minimale imposée), fiscalité standard sur les plus-values. Utile pour du placement à moyen terme sans contrainte de blocage.",
      },
    ],
  },
  {
    name: "Immobilier",
    image: "/images/pages/immobilier.jpg",
    count: "5 solutions",
    products: [
      {
        title: "Immobilier résidentiel",
        oneline: "Appartements et villas, à habiter ou à louer.",
        detail: "Acquisition d’un bien résidentiel, résidence principale, secondaire ou investissement locatif. Nous vous aidons à définir le projet, sélectionner le bien avec notre réseau d’agents partenaires et structurer le financement (crédit, apport, détention en nom propre ou en société). Un actif tangible, qui se valorise dans la durée.",
      },
      {
        title: "Locaux commerciaux - rendement locatif",
        oneline: "Acquisition de commerces loués pour un revenu régulier.",
        detail: "Investissement dans des locaux commerciaux déjà loués ou à louer (boutiques, bureaux), générant un loyer mensuel. Nous sélectionnons l’emplacement, le locataire et structurons l’acquisition (nom propre ou société) avec notre réseau de professionnels.",
      },
      {
        title: "Club deals immobiliers",
        oneline: "Co-investissement à plusieurs sur un actif immobilier ciblé.",
        detail: "Plusieurs investisseurs mettent en commun leurs fonds pour acquérir un actif immobilier de plus grande taille (immeuble, résidence) qu’ils ne pourraient financer seuls. Ticket d’entrée réduit, gestion mutualisée, sortie généralement à moyen terme.",
      },
      {
        title: "Hôtellerie",
        oneline: "Participation dans des actifs hôteliers ou parahôteliers.",
        detail: "Investissement dans des unités hôtelières ou résidences de tourisme, exploitées par un opérateur professionnel. Revenu indexé sur la performance de l’exploitation ou loyer garanti selon le montage. Horizon moyen-long terme.",
      },
      {
        title: "Promotion immobilière",
        oneline: "Financement de programmes immobiliers en développement.",
        detail: "Participation au financement d’un programme immobilier porté par un promoteur partenaire - résidentiel ou mixte. Rendement potentiellement plus élevé, en contrepartie d’un risque projet (délais, commercialisation) propre à la promotion.",
      },
    ],
  },
  {
    name: "Private Equity",
    image: "/images/pages/private-equity.jpg",
    count: "1 solution",
    products: [
      {
        title: "Prises de participation PE",
        oneline: "Investissement au capital d’entreprises non cotées en croissance.",
        detail: "Prise de participation minoritaire dans des sociétés marocaines établies, en phase de croissance ou de transmission. Horizon long (5-8 ans), liquidité réduite, rendement visé supérieur aux placements traditionnels. Réservé aux patrimoines diversifiés pouvant immobiliser une partie de leurs actifs.",
      },
    ],
  },
  {
    name: "Venture Capital",
    image: "/images/pages/venture-capital.jpg",
    count: "1 solution",
    products: [
      {
        title: "Investissement dans des startups",
        oneline: "Tickets d’investissement dans de jeunes entreprises innovantes.",
        detail: "Participation à des levées de fonds de startups marocaines ou régionales sélectionnées avec des fonds VC partenaires. Risque élevé, horizon long, rendement potentiel important mais non garanti - réservé à une part limitée du patrimoine.",
      },
    ],
  },
  {
    name: "Art",
    image: "/images/pages/art.jpg",
    count: "1 solution",
    products: [
      {
        title: "Acquisition d’œuvres d’art",
        oneline: "Diversification patrimoniale par l’acquisition d’œuvres sélectionnées.",
        detail: "Accompagnement dans l’acquisition d’œuvres d’artistes marocains et internationaux, en lien avec des experts et galeries partenaires - authentification, valorisation et conservation. Diversification hors marchés financiers, plaisir patrimonial autant que placement.",
      },
    ],
  },
];

const entreprises: Category[] = [
  {
    name: "Épargne Salariale",
    image: "/images/pages/epargne-salariale.jpg",
    count: "2 solutions",
    products: [
      {
        title: "PER Collectif - allocation selon profil de risque",
        oneline: "Un PER d’entreprise géré selon le profil de chaque collaborateur.",
        detail: "Nous mettons en place un Plan d’Épargne Retraite collectif pour vos salariés, avec une allocation ajustée au profil de risque de chacun plutôt qu’une gestion uniforme - pour améliorer le rendement de leur épargne sans complexifier votre gestion RH. Un outil de fidélisation concret, au-delà du salaire.",
      },
      {
        title: "Accompagnement et pédagogie collaborateurs",
        oneline: "Des sessions dédiées pour que vos équipes comprennent leur épargne.",
        detail: "Nous organisons des sessions d’explication pour vos collaborateurs - comment fonctionne leur PER, comment choisir leur allocation, quels avantages fiscaux. Une épargne bien comprise est une épargne qui fidélise davantage.",
      },
    ],
  },
  {
    name: "Trésorerie d’entreprise",
    image: "/images/pages/tresorerie.jpg",
    count: "1 solution",
    products: [
      {
        title: "Placement de trésorerie excédentaire",
        oneline: "Faire fructifier une trésorerie d’entreprise sans l’immobiliser.",
        detail: "Stratégie combinant produits liquides et produits de rendement pour une trésorerie d’entreprise excédentaire, structurée selon votre besoin de disponibilité des fonds. Objectif : ne pas laisser dormir une trésorerie qui pourrait travailler, sans compromettre la capacité opérationnelle de l’entreprise.",
      },
    ],
  },
];

/**
 * Le catalogue d'un public : les classes d'actifs en grandes cartes photo, qui
 * servent d'onglets ; dessous, les solutions de la classe choisie, chacune
 * dépliable pour comprendre à quoi elle sert.
 */
function Catalogue({ categories }: { categories: Category[] }) {
  const uid = useId();
  const [cat, setCat] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const current = categories[cat];
  // Peu de classes (solutions entreprises) : des cartes à largeur fixe plutôt
  // qu'étirées sur toute la ligne, où la photo perdait en netteté.
  const compact = categories.length < 4;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Classes d’actifs"
        // Toutes les classes restent visibles à toute largeur : une grille en
        // dessous de lg (aucune carte rognée hors champ), une rangée souple au-delà.
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:gap-4"
      >
        {categories.map((c, i) => (
          <button
            key={c.name}
            role="tab"
            type="button"
            aria-selected={cat === i}
            aria-controls={`${uid}-panel`}
            onClick={() => {
              setCat(i);
              setOpen(null);
            }}
            className={`group relative overflow-hidden rounded-[20px] text-left transition-[flex-grow,opacity,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] h-[150px] sm:h-[190px] lg:h-[360px] lg:min-w-0 ${
              cat === i
                ? `ring-2 ring-ink ring-offset-2 lg:ring-0 lg:ring-offset-0 ${compact ? "lg:w-[440px] lg:flex-none" : "lg:flex-[2.4]"}`
                : `opacity-80 hover:opacity-100 ${compact ? "lg:w-[260px] lg:flex-none" : "lg:flex-1"}`
            }`}
          >
            <Image src={c.image} alt="" fill sizes="(min-width: 1024px) 560px, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
            <span className="absolute inset-x-4 bottom-4 lg:inset-x-5 lg:bottom-5">
              <span className="block text-[12.5px] text-cream/80">{c.count}</span>
              <span className={`mt-1 block font-heading font-light leading-tight text-white text-[19px] sm:text-[22px] ${cat === i ? "lg:text-[26px]" : "lg:text-[20px] xl:text-[22px]"}`}>{c.name}</span>
            </span>
          </button>
        ))}
      </div>

      <div
        id={`${uid}-panel`}
        role="tabpanel"
        aria-label={current.name}
        className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20"
      >
        <div>
          <h3 className="display-md text-ink">{current.name}</h3>
          <p className="mt-3 text-[15px] text-warm-grey">{current.count} · ouvrez-en une pour comprendre à quoi elle sert</p>
        </div>
        <ul className="border-t border-ink/10">
          {current.products.map((p, i) => {
            const expanded = open === i;
            return (
              <li key={p.title} className="border-b border-ink/10">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`${uid}-${cat}-${i}`}
                  onClick={() => setOpen(expanded ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  <span>
                    <span className="block text-[19px] font-medium leading-snug text-ink">{p.title}</span>
                    <span className="mt-1 block text-[15px] text-warm-grey">{p.oneline}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`grid size-9 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                      expanded ? "rotate-45 border-ink bg-ink text-white" : "border-ink/20 text-ink"
                    }`}
                  >
                    <Plus className="size-4" />
                  </span>
                </button>
                <div
                  id={`${uid}-${cat}-${i}`}
                  className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-[62ch] pb-7 text-[16px] leading-relaxed text-charcoal">{p.detail}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Hauteur de l'en-tête collant, pour que l'intitulé visé ne passe pas dessous. */
const HEADER_H = 96;

export default function ProduitsPage() {
  return (
    <>
      <HashScroll id="individuelles" offset={HEADER_H} />
      <HashScroll id="entreprises" offset={HEADER_H} />
      <HashScroll id="ceder" />

      <PageHero
        tag="Nos produits"
        title="Des produits, présentés clairement."
        subtitle={"Choisissez une solution pour comprendre à quoi elle sert, sans jargon.\nChaque recommandation reste choisie pour votre situation."}
        image="/images/pages/produits-hero.jpg"
        anchors={[
          { href: "#individuelles", label: "Pour vous" },
          { href: "#entreprises", label: "Pour votre entreprise" },
          { href: "#ceder", label: "Céder un actif" },
        ]}
      />

      <section id="individuelles" className="shell pb-20 lg:pb-32">
        <div className="mb-12 grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 className="display-lg text-ink">Solutions individuelles</h2>
          <p className="lead max-w-[48ch] lg:justify-self-end">
            Épargner, investir, préparer votre retraite ou transmettre : nous construisons avec vous des solutions
            pensées pour votre situation personnelle et familiale.
          </p>
        </div>
        <Catalogue categories={individuelles} />
      </section>

      <section id="entreprises" className="shell pb-20 lg:pb-32">
        <div className="panel px-6 py-14 sm:px-12 lg:px-16 lg:py-20">
          <div className="mb-12 grid gap-6 lg:grid-cols-2 lg:items-end">
            <h2 className="display-lg text-ink">Solutions entreprises</h2>
            <p className="lead max-w-[48ch] lg:justify-self-end">
              Fidéliser vos collaborateurs, faire fructifier votre trésorerie : nous accompagnons aussi les dirigeants,
              pas seulement les particuliers.
            </p>
          </div>
          <Catalogue categories={entreprises} />
        </div>
      </section>

      <section id="ceder" className="bg-ink text-cream">
        <div className="shell section-y grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2 className="display-lg text-cream">Un actif à céder ?</h2>
            <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-cream-muted">
              Bien immobilier, entreprise, participation, œuvre d’art… décrivez l’actif que vous souhaitez
              céder. Nous l’étudions et le présentons de façon sélective aux clients pour qui il est pertinent.
            </p>
          </div>
          <AnimateIn variant="fade-up">
            <div className="rounded-[24px] bg-white p-6 text-ink sm:p-10">
              <AssetForm />
            </div>
          </AnimateIn>
        </div>
      </section>

      <CtaBand title="Une solution retient votre attention ?" label="Prendre rendez-vous" />
    </>
  );
}
