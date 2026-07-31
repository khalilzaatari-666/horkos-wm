"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        title: "PER — Plan d'Épargne Retraite",
        oneline: "Épargne bloquée jusqu'à la retraite, avantage fiscal à l'entrée.",
        detail: "Les versements réduisent votre revenu imposable chaque année. En contrepartie, l'épargne reste bloquée jusqu'au départ à la retraite (sauf cas de déblocage anticipé : achat de résidence principale, invalidité...). Adapté aux revenus élevés qui veulent lisser leur fiscalité sur le long terme.",
      },
      {
        title: "PEA — Plan d'Épargne en Actions",
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
        title: "Locaux commerciaux — rendement locatif",
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
        detail: "Participation au financement d'un programme immobilier porté par un promoteur partenaire — résidentiel ou mixte. Rendement potentiellement plus élevé, en contrepartie d'un risque projet (délais, commercialisation) propre à la promotion.",
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
        detail: "Participation à des levées de fonds de startups marocaines ou régionales sélectionnées avec des fonds VC partenaires. Risque élevé, horizon long, rendement potentiel important mais non garanti — réservé à une part limitée du patrimoine.",
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
        detail: "Accompagnement dans l'acquisition d'œuvres d'artistes marocains et internationaux, en lien avec des experts et galeries partenaires — authentification, valorisation et conservation. Diversification hors marchés financiers, plaisir patrimonial autant que placement.",
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
        title: "PER Collectif — allocation selon profil de risque",
        oneline: "Un PER d'entreprise géré selon le profil de chaque collaborateur.",
        detail: "Nous mettons en place un Plan d'Épargne Retraite collectif pour vos salariés, avec une allocation ajustée au profil de risque de chacun plutôt qu'une gestion uniforme — pour améliorer le rendement de leur épargne sans complexifier votre gestion RH. Un outil de fidélisation concret, au-delà du salaire.",
      },
      {
        title: "Accompagnement et pédagogie collaborateurs",
        oneline: "Des sessions dédiées pour que vos équipes comprennent leur épargne.",
        detail: "Nous organisons des sessions d'explication pour vos collaborateurs — comment fonctionne leur PER, comment choisir leur allocation, quels avantages fiscaux. Une épargne bien comprise est une épargne qui fidélise davantage.",
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

function ProductCard({ product, variant = "cream" }: { product: Product; variant?: "cream" | "white" }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-lg cursor-pointer transition-all duration-300 hover:shadow-sm border ${variant === "cream" ? "bg-cream border-cream-deep hover:border-bronze/30" : "bg-white border-ink/[0.08] hover:border-bronze/30"}`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex-1 min-w-0 mr-4">
          <h4 className="text-[15px] font-semibold">{product.title}</h4>
          <p className="text-[13px] text-warm-grey mt-0.5 leading-[1.5]">{product.oneline}</p>
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
    <AnimateIn delay={delay}>
      <div className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-[18px] font-semibold">{category.name}</h3>
          <span className="text-[12px] text-warm-grey font-medium">{category.count}</span>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {category.products.map((p) => (
            <ProductCard key={p.title} product={p} variant={variant} />
          ))}
        </div>
      </div>
    </AnimateIn>
  );
}

export default function ProduitsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-cream pt-[50px] pb-[36px]">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="inline-block bg-cream/[0.08] border border-cream/[0.18] text-bronze-light text-[11px] font-semibold tracking-[1.5px] uppercase px-3.5 py-1.5 mb-4">
              Notre gamme
            </span>
            <h1 className="text-[30px] font-medium text-cream max-w-[660px] leading-[1.3]">
              Des produits, présentés clairement.
            </h1>
            <p className="text-[#D8CDBC] max-w-[620px] mt-3.5 text-[14.5px] leading-[1.7]">
              Cliquez sur une solution pour comprendre à quoi elle sert, sans jargon. Chaque recommandation reste choisie pour votre situation.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Solutions individuelles */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Pour vous
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-8">
              Solutions individuelles
            </h2>
          </AnimateIn>

          {individuelles.map((cat, i) => (
            <CategoryBlock key={cat.name} category={cat} delay={i * 80} variant="cream" />
          ))}
        </div>
      </section>

      {/* Solutions entreprises */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Pour votre entreprise
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-4">
              Solutions entreprises
            </h2>
            <p className="text-[14.5px] text-warm-grey max-w-[620px] leading-[1.7] mb-8">
              Fidéliser vos collaborateurs, faire fructifier votre trésorerie : nous accompagnons aussi les dirigeants, pas seulement les particuliers.
            </p>
          </AnimateIn>

          <AnimateIn>
            <div className="bg-cream-deep/60 border-l-2 border-bronze-light rounded-r-lg p-5 mb-10 text-[14.5px] text-charcoal leading-[1.7] max-w-[700px]">
              &quot;Vous êtes chef d&apos;entreprise et cherchez à fidéliser vos équipes tout en développant le rendement de la poche fiscale PER de vos collaborateurs ? Nous avons la solution.&quot;
            </div>
          </AnimateIn>

          {entreprises.map((cat, i) => (
            <CategoryBlock key={cat.name} category={cat} delay={i * 80} variant="white" />
          ))}
        </div>
      </section>

      {/* Céder un actif */}
      <section className="py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-7">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimateIn>
              <div className="flex flex-col justify-center">
                <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
                  Céder un actif
                </span>
                <h2 className="text-[27px] font-semibold mt-2.5 mb-4">
                  Un actif à céder ?
                </h2>
                <p className="text-[14.5px] text-warm-grey leading-[1.7] max-w-[480px]">
                  Bien immobilier, entreprise, participation, œuvre d&apos;art… décrivez l&apos;actif que vous souhaitez céder. Notre équipe l&apos;étudie et le présente de façon sélective aux clients pour qui il est pertinent.
                </p>
              </div>
            </AnimateIn>

            <AnimateIn delay={150}>
              <div className="bg-white rounded-lg p-7 shadow-sm">
                <h4 className="text-[16px] font-semibold mb-5">Formulaire de soumission</h4>
                <form className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Type d&apos;actif à céder</Label>
                    <select className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" required defaultValue="">
                      <option value="" disabled>Sélectionnez un type</option>
                      <optgroup label="Immobilier">
                        <option>Résidence (principale ou secondaire)</option>
                        <option>Bien locatif résidentiel</option>
                        <option>Local commercial</option>
                        <option>Immeuble de rapport</option>
                        <option>Terrain</option>
                        <option>Actif hôtelier / parahôtelier</option>
                        <option>Programme immobilier en développement</option>
                      </optgroup>
                      <optgroup label="Entreprise & participations">
                        <option>Entreprise — cession totale</option>
                        <option>Participation minoritaire</option>
                        <option>Part de SCI / société patrimoniale</option>
                        <option>Participation dans un fonds ou club deal</option>
                      </optgroup>
                      <optgroup label="Actifs financiers">
                        <option>Portefeuille de valeurs mobilières</option>
                        <option>Contrat d&apos;assurance-vie existant</option>
                      </optgroup>
                      <optgroup label="Autres">
                        <option>Œuvre d&apos;art</option>
                        <option>Autre actif</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Motif de la cession</Label>
                    <select className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" required defaultValue="">
                      <option value="" disabled>Sélectionnez un motif</option>
                      <option>Succession / transmission en cours</option>
                      <option>Besoin de liquidités</option>
                      <option>Réorientation de la stratégie patrimoniale</option>
                      <option>Départ à la retraite</option>
                      <option>Divorce / séparation</option>
                      <option>Simplification du patrimoine</option>
                      <option>Opportunité de marché</option>
                      <option>Autre raison</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Nom / Société</Label>
                      <Input type="text" placeholder="Votre nom ou société" className="h-11 rounded-lg" required pattern="[a-zA-ZÀ-ÿ\s'\-]+" title="Lettres uniquement" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Téléphone</Label>
                      <Input type="tel" placeholder="+212 6XX XXX XXX" className="h-11 rounded-lg" required pattern="[\+]?[0-9\s\-]{7,15}" title="Numéro de téléphone valide" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" placeholder="votre@email.com" className="h-11 rounded-lg" required />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Valeur estimée (MAD)</Label>
                      <Input type="number" placeholder="Ex: 5000000" className="h-11 rounded-lg" required min={0} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Horizon souhaité</Label>
                      <Input type="text" placeholder="Ex: 6 mois" className="h-11 rounded-lg" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Description de l&apos;actif</Label>
                    <textarea placeholder="Décrivez l'actif que vous souhaitez céder..." rows={3} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
                  </div>

                  <button type="submit" className="w-full bg-bronze text-white h-11 font-medium text-[13.5px] tracking-[0.2px] hover:bg-bronze-dark transition-colors rounded-lg">
                    Soumettre mon dossier
                  </button>
                </form>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-cream-deep border-t border-ink/[0.06]">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <AnimateIn>
            <h2 className="text-[27px] font-semibold mx-auto max-w-[680px]">
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
