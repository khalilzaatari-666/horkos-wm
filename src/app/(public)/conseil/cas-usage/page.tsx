"use client";

import Image from "next/image";
import { useState } from "react";
import { PageHero } from "@/components/public/page-hero";
import { CtaBand } from "@/components/public/cta-band";
import { StructureDiagram, type StructureColumn } from "@/components/public/structure-diagram";

interface CaseDetail {
  label: string;
  text: string;
}

interface UseCase {
  tag: string;
  image: string;
  diagram: { before: StructureColumn; after: StructureColumn };
  title: string;
  punch: string;
  details: CaseDetail[];
}

const cases: UseCase[] = [
  {
    tag: "Transmission",
    image: "/images/pages/cas-transmission.jpg",
    diagram: {
      before: { title: "Avant", chain: [{ label: "Entrepreneur" }, { label: "Immeuble locatif", sub: "en nom propre" }] },
      after: {
        title: "Après",
        chain: [
          { label: "Entrepreneur et ses enfants", sub: "associés" },
          { label: "Société immobilière", sub: "détient l’immeuble", tone: "key" },
          { label: "Immeuble locatif" },
        ],
        aside: [{ label: "Expert indépendant", sub: "évalue" }, { label: "Expert-comptable", sub: "tient les comptes" }],
      },
    },
    title: "Intégrer un bien immobilier dans une société",
    punch: "\"Transmettre un immeuble à mes enfants, sans indivision.\"",
    details: [
      { label: "Objectif", text: "Un entrepreneur veut préparer la transmission d’un immeuble locatif à ses deux enfants sans indivision complexe." },
      { label: "Accompagnement", text: "Nous avons audité sa situation, fait évaluer le bien par un expert indépendant, puis structuré son apport au capital d’une société immobilière dont un expert-comptable du réseau tient aujourd’hui la comptabilité." },
      { label: "Suivi", text: "La transmission se fait désormais par simple donation de parts, et la famille suit l’évolution de la société chaque mois depuis son espace client." },
    ],
  },
  {
    tag: "Diversification",
    image: "/images/pages/cas-diversification.jpg",
    diagram: {
      before: { title: "Avant", chain: [{ label: "PME" }, { label: "Trésorerie excédentaire", sub: "qui dort" }] },
      after: {
        title: "Après",
        chain: [{ label: "PME" }, { label: "Stratégie de trésorerie", sub: "selon les besoins de liquidité", tone: "key" }],
        aside: [{ label: "Poche liquide", sub: "mobilisable" }, { label: "Poche de rendement" }, { label: "Point trimestriel" }],
      },
    },
    title: "Diversifier une trésorerie d’entreprise",
    punch: "\"Faire fructifier ma trésorerie sans l'immobiliser.\"",
    details: [
      { label: "Objectif", text: "Un dirigeant de PME veut faire fructifier une trésorerie excédentaire sans l’immobiliser sur le très long terme." },
      { label: "Accompagnement", text: "Après avoir compris ses besoins de liquidité, nous avons construit une stratégie combinant assurance-vie et fonds en détention directe, pour garder une partie des sommes mobilisable à tout moment." },
      { label: "Suivi", text: "Son portefeuille est aujourd’hui réparti entre une poche liquide et une poche de rendement, avec un point avec son conseiller chaque trimestre." },
    ],
  },
  {
    tag: "Retraite et fiscalité",
    image: "/images/pages/cas-retraite.jpg",
    diagram: {
      before: { title: "Avant", chain: [{ label: "Cadre dirigeant" }, { label: "Revenu imposable élevé", sub: "aucune épargne retraite" }] },
      after: {
        title: "Après",
        chain: [{ label: "Cadre dirigeant" }, { label: "Plan d’épargne retraite et assurance-vie", tone: "key" }],
        aside: [{ label: "Avocat fiscaliste", sub: "sécurise" }, { label: "Bilan annuel" }],
      },
    },
    title: "Préparer sa retraite en optimisant sa fiscalité",
    punch: "\"Réduire mes impôts aujourd'hui, préparer demain.\"",
    details: [
      { label: "Objectif", text: "Un cadre dirigeant à revenu élevé veut préparer sa retraite tout en réduisant son revenu imposable dès aujourd’hui." },
      { label: "Accompagnement", text: "Nous avons construit une stratégie combinant un plan d’épargne retraite et un contrat d’assurance-vie, puis mis ce client en relation avec un avocat fiscaliste du réseau pour sécuriser le montage." },
      { label: "Suivi", text: "Son revenu imposable a baissé dès la première année, pendant que son épargne retraite se constitue progressivement, avec un bilan chaque année." },
    ],
  },
];

export default function CasUsagePage() {
  const [active, setActive] = useState(0);
  const c = cases[active];

  return (
    <>
      <PageHero
        tag="Cas d’usage"
        title="Trois situations, trois stratégies sur mesure."
        subtitle="Chaque client a un objectif différent. Choisissez une situation pour voir comment nous l’avons accompagnée."
        image="/images/editorial/arches.jpg"
      />

      <section className="shell pb-12 lg:pb-16">
        <div role="tablist" aria-label="Situations" className="no-scrollbar flex gap-x-8 overflow-x-auto whitespace-nowrap border-b border-ink/10">
          {cases.map((x, i) => (
            <button
              key={x.title}
              role="tab"
              type="button"
              aria-selected={active === i}
              aria-controls="dossier"
              onClick={() => setActive(i)}
              className={`relative shrink-0 pb-3 text-[16px] transition-colors duration-300 ${
                active === i ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-ink" : "text-warm-grey hover:text-ink"
              }`}
            >
              {x.tag}
            </button>
          ))}
        </div>

        <article id="dossier" role="tabpanel" key={active} className="mt-10 animate-in fade-in duration-500">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
            <div>
              <h2 className="display-lg text-ink">{c.title}</h2>
              <p className="mt-8 font-heading text-[clamp(1.5rem,2.6vw,2.2rem)] font-light italic leading-snug text-charcoal">
                {c.punch.replace(/"/g, "")}
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-cream-deep">
              <Image src={c.image} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>

          <dl className="mt-14 grid gap-x-10 md:grid-cols-3">
            {c.details.map((d) => (
              <div key={d.label} className="border-t border-ink/10 py-7">
                <dt className="text-[14px] text-warm-grey">{d.label}</dt>
                <dd className="mt-3 text-[17px] leading-relaxed text-ink">{d.text}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10">
            <StructureDiagram before={c.diagram.before} after={c.diagram.after} />
          </div>
        </article>
      </section>

      <CtaBand title="Votre situation ressemble à l’une de ces histoires ?" label="Prendre rendez-vous" />
    </>
  );
}
