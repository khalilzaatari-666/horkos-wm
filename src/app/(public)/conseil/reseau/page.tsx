"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";
import { DrawLine } from "@/components/ui/draw-line";
import { StackCards } from "@/components/ui/stack-cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type PartnerCategory = "gestion" | "assureur" | "immo" | "fonds" | "club";

const categoryLabels: { key: PartnerCategory; label: string; full?: boolean }[] = [
  { key: "gestion", label: "Société de gestion" },
  { key: "assureur", label: "Assureur" },
  { key: "immo", label: "Agent immobilier" },
  { key: "fonds", label: "Fonds Private Equity / Venture Capital" },
  { key: "club", label: "Club deal / partenariat business", full: true },
];

const selectClass = "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function CategoryFields({ cat }: { cat: PartnerCategory }) {
  switch (cat) {
    case "gestion":
      return (
        <>
          <div className="space-y-1.5">
            <Label>Type de fonds proposé</Label>
            <select className={selectClass} required defaultValue="">
              <option value="" disabled>Sélectionnez un type</option>
              <option>OPCVM actions</option>
              <option>OPCVM obligataire</option>
              <option>OPCVM diversifié</option>
              <option>OPCVM monétaire</option>
              <option>Autre véhicule de gestion</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Encours sous gestion (MAD)</Label>
              <Input type="number" placeholder="Ex: 50000000" className="h-11 rounded-lg" required min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Frais de gestion (%)</Label>
              <Input type="number" placeholder="Ex: 1.5" className="h-11 rounded-lg" required min={0} max={100} step={0.01} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Performance / track record du fonds</Label>
            <textarea placeholder="Décrivez les performances historiques..." rows={3} required className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
          </div>
        </>
      );
    case "assureur":
      return (
        <>
          <div className="space-y-1.5">
            <Label>Type de produit proposé</Label>
            <select className={selectClass} required defaultValue="">
              <option value="" disabled>Sélectionnez un type</option>
              <option>Assurance-vie multisupport</option>
              <option>PER - Plan d&apos;Épargne Retraite</option>
              <option>Prévoyance patrimoniale</option>
              <option>Autre produit d&apos;assurance</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frais de gestion (%)</Label>
              <Input type="number" placeholder="Ex: 0.8" className="h-11 rounded-lg" required min={0} max={100} step={0.01} />
            </div>
            <div className="space-y-1.5">
              <Label>Fonds en dirhams disponible</Label>
              <select className={selectClass} required defaultValue="">
                <option value="" disabled>Sélectionnez</option>
                <option>Oui</option>
                <option>Non</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Spécificités du contrat</Label>
            <textarea placeholder="Décrivez les spécificités..." rows={3} required className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
          </div>
        </>
      );
    case "immo":
      return (
        <>
          <div className="space-y-1.5">
            <Label>Type de bien à proposer</Label>
            <select className={selectClass} required defaultValue="">
              <option value="" disabled>Sélectionnez un type</option>
              <option>Résidentiel</option>
              <option>Local commercial</option>
              <option>Immeuble de rapport</option>
              <option>Terrain</option>
              <option>Actif hôtelier / parahôtelier</option>
              <option>Programme neuf</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Localisation</Label>
              <Input type="text" placeholder="Ville, quartier..." className="h-11 rounded-lg" required pattern="[a-zA-ZÀ-ÿ\s'\-,]+" title="Lettres uniquement" />
            </div>
            <div className="space-y-1.5">
              <Label>Prix de vente (MAD)</Label>
              <Input type="number" placeholder="Ex: 5000000" className="h-11 rounded-lg" required min={0} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Rendement locatif estimé (%)</Label>
            <Input type="number" placeholder="Ex: 6.5" className="h-11 rounded-lg" required min={0} max={100} step={0.01} />
          </div>
        </>
      );
    case "fonds":
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type de levée</Label>
              <select className={selectClass} required defaultValue="">
                <option value="" disabled>Sélectionnez</option>
                <option>Private Equity</option>
                <option>Venture Capital</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Stade</Label>
              <select className={selectClass} required defaultValue="">
                <option value="" disabled>Sélectionnez</option>
                <option>Amorçage / Seed</option>
                <option>Série A</option>
                <option>Croissance</option>
                <option>Transmission / LBO</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Secteur cible</Label>
            <Input type="text" placeholder="Ex: Fintech, Agroalimentaire..." className="h-11 rounded-lg" required pattern="[a-zA-ZÀ-ÿ\s,/\-&]+" title="Lettres et séparateurs uniquement" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Montant recherché (MAD)</Label>
              <Input type="number" placeholder="Ex: 10000000" className="h-11 rounded-lg" required min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Ticket d&apos;entrée minimum (MAD)</Label>
              <Input type="number" placeholder="Ex: 500000" className="h-11 rounded-lg" required min={0} />
            </div>
          </div>
        </>
      );
    case "club":
      return (
        <>
          <div className="space-y-1.5">
            <Label>Nature du partenariat</Label>
            <select className={selectClass} required defaultValue="">
              <option value="" disabled>Sélectionnez</option>
              <option>Club deal immobilier</option>
              <option>Partenariat commercial</option>
              <option>Apport d&apos;affaires</option>
              <option>Autre partenariat</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Montant à mobiliser (MAD)</Label>
              <Input type="number" placeholder="Ex: 20000000" className="h-11 rounded-lg" required min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre de co-investisseurs</Label>
              <Input type="number" placeholder="Ex: 5" className="h-11 rounded-lg" required min={1} />
            </div>
          </div>
        </>
      );
  }
}

export default function ReseauPage() {
  const [activeCat, setActiveCat] = useState<PartnerCategory>("gestion");
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
            <div className="bg-white rounded-lg p-7 shadow-sm max-w-[760px] mx-auto">
              <h4 className="text-[17.5px] font-semibold mb-5">Questionnaire de partenariat</h4>

              {/* Category selector */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {categoryLabels.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setActiveCat(c.key)}
                    className={`px-4 py-3 rounded-lg text-[13.5px] font-medium border transition-all duration-200 text-left ${
                      c.full ? "col-span-2" : ""
                    } ${
                      activeCat === c.key
                        ? "border-bronze bg-bronze/10 text-bronze"
                        : "border-ink/[0.1] bg-white text-charcoal hover:border-bronze/30"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <form className="space-y-4">
                {/* Dynamic fields per category */}
                <CategoryFields cat={activeCat} />

                {/* Common fields */}
                <div className="border-t border-ink/[0.08] pt-4 mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Nom du contact</Label>
                      <Input type="text" placeholder="Votre nom" className="h-11 rounded-lg" required pattern="[a-zA-ZÀ-ÿ\s'\-]+" title="Lettres uniquement" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Société</Label>
                      <Input type="text" placeholder="Nom de la société" className="h-11 rounded-lg" required pattern="[a-zA-ZÀ-ÿ0-9\s'\-&.]+" title="Caractères alphanumériques uniquement" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Téléphone</Label>
                      <Input type="tel" placeholder="+212 6XX XXX XXX" className="h-11 rounded-lg" required pattern="[\+]?[0-9\s\-]{7,15}" title="Numéro de téléphone valide" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" placeholder="votre@email.com" className="h-11 rounded-lg" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description complémentaire</Label>
                    <textarea placeholder="Informations supplémentaires..." rows={3} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-bronze text-white h-11 font-medium text-[13.5px] tracking-[0.2px] hover:bg-bronze-dark transition-colors rounded-lg">
                  Soumettre ma proposition
                </button>
              </form>
            </div>
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
