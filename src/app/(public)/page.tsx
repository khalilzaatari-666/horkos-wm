"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { AnimateIn } from "@/components/ui/animate-in";

const besoins = [
  { title: "Structurer mon patrimoine", desc: "Organiser des actifs dispersés dans une logique cohérente." },
  { title: "Préparer ma retraite", desc: "Construire un capital ou un revenu complémentaire dans la durée." },
  { title: "Transmettre à mes enfants", desc: "Anticiper une succession ou une donation dans de bonnes conditions." },
  { title: "Diversifier mes investissements", desc: "Répartir un patrimoine trop concentré sur une seule classe d'actifs." },
  { title: "Optimiser ma fiscalité", desc: "Choisir les enveloppes et structures adaptées à votre situation." },
  { title: "Structurer une société", desc: "Créer ou réorganiser une société patrimoniale ou d'exploitation." },
  { title: "Fidéliser mes collaborateurs", desc: "Mettre en place une épargne salariale (PER collectif) pour mon entreprise." },
];

const steps = [
  { n: "01", title: "Comprendre votre situation", desc: "Un premier échange, puis un audit patrimonial qui sert de socle." },
  { n: "02", title: "Construire votre stratégie d'investissement", desc: "Recommandations sur-mesure." },
  { n: "03", title: "Suivre dans la durée", desc: "Gouvernance, reporting et ajustement continu." },
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

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-cream py-[90px] pb-[70px]">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="inline-block text-bronze-light text-xs font-semibold tracking-[2px] uppercase mb-[22px]">
              Votre patrimoine, notre engagement
            </span>
            <div className="w-[44px] h-px bg-bronze mb-6" />
            <h1 className="text-[40px] leading-[1.22] font-medium text-cream max-w-[680px]">
              Le conseil qui structure l&apos;ensemble de votre patrimoine.
            </h1>
            <p className="text-[16px] text-[#D8CDBC] max-w-[560px] mt-5 mb-[30px] leading-[1.75]">
              Horkos centralise vos besoins patrimoniaux et s&apos;appuie sur un réseau de professionnels pour construire une stratégie d&apos;investissement cohérente.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/questionnaire"
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
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Votre point de départ
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-2.5 max-w-[680px]">
              Nous partons de vos besoins, jamais de nos produits.
            </h2>
            <p className="text-warm-grey text-[14.5px] max-w-[640px] mb-[34px] leading-[1.65]">
              Avant toute recommandation, nous identifions précisément ce que vous cherchez à accomplir.
            </p>
          </AnimateIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {besoins.map((b, i) => (
              <AnimateIn key={b.title} delay={i * 80}>
                <div className="bg-cream border border-cream-deep p-5 rounded-lg hover:shadow-md transition-shadow">
                  <h4 className="text-[14px] font-semibold text-ink mb-1.5">{b.title}</h4>
                  <p className="text-[12.5px] text-warm-grey leading-[1.5]">{b.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
          <AnimateIn delay={200}>
            <div className="mt-[26px]">
              <Link
                href="/questionnaire"
                className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
              >
                Identifier mon besoin →
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Comment ça marche
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-2.5 max-w-[680px]">
              Trois étapes, un seul objectif : que vous compreniez avant de décider
            </h2>
          </AnimateIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {steps.map((s, i) => (
              <AnimateIn key={s.n} delay={i * 120}>
                <div className="bg-white border border-cream-deep p-[26px] rounded-lg h-full">
                  <div className="font-heading text-[28px] text-bronze font-medium mb-3">{s.n}</div>
                  <h3 className="text-[16px] font-semibold mb-2">{s.title}</h3>
                  <p className="text-[13.5px] text-warm-grey leading-[1.6]">{s.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Relation / Fondateur */}
      <section className="py-16 bg-ink text-cream">
        <div className="max-w-[1200px] mx-auto px-7 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-[60px] items-center">
          <AnimateIn>
            <span className="text-bronze-light text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              L&apos;équipe
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-2.5 text-cream max-w-[680px]">
              Vous ne créez pas un espace client, vous créez une relation de confiance.
            </h2>
            <p className="text-[#D8CDBC] text-[15px] leading-[1.75] max-w-[480px]">
              Ce qui fait la différence, ce n&apos;est pas un algorithme ni un catalogue de produits. C&apos;est la personne qui prend le temps de comprendre votre besoin, de mobiliser les bons experts, et de rester à vos côtés.
            </p>
            <div className="mt-6 max-w-[480px] bg-cream/[0.06] border-l-2 border-bronze-light px-[26px] py-[22px] font-heading italic text-[19px] text-cream leading-[1.5]">
              &quot;La gestion de patrimoine ne manque pas de produits. Elle manque de conseil. Chez Horkos, rien n&apos;est recommandé avant d&apos;être compris.&quot;
            </div>
          </AnimateIn>
          <AnimateIn delay={150}>
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
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7 grid grid-cols-1 lg:grid-cols-2 gap-[50px] items-center">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Marocains résidant à l&apos;étranger
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-2.5 max-w-[680px]">
              Un double regard, Maroc et France.
            </h2>
            <p className="text-warm-grey text-[14.5px] max-w-[640px] mb-6 leading-[1.65]">
              Gérer un patrimoine entre deux pays, ce n&apos;est pas gérer deux patrimoines séparés. C&apos;est comprendre comment la fiscalité marocaine et la fiscalité française ou européenne s&apos;articulent - et où elles créent des opportunités ou des risques que vous ne verriez pas seul.
            </p>
            <Link
              href="/questionnaire"
              className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
            >
              Prendre rendez-vous depuis l&apos;étranger →
            </Link>
          </AnimateIn>
          <AnimateIn delay={150}>
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
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7 grid grid-cols-1 lg:grid-cols-2 gap-[50px] items-center">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Nos solutions
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-2.5 max-w-[680px]">
              Des produits, une seule logique : votre stratégie globale.
            </h2>
            <p className="text-warm-grey text-[14.5px] max-w-[640px] mb-6 leading-[1.65]">
              Une fois votre besoin identifié, nous mobilisons les solutions adaptées - placements financiers, immobilier, private equity, venture capital, art. Jamais l&apos;inverse.
            </p>
            <Link
              href="/cabinet/produits"
              className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
            >
              Découvrir nos produits →
            </Link>
          </AnimateIn>
          <AnimateIn delay={150}>
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
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7 grid grid-cols-1 lg:grid-cols-2 gap-[50px] items-center">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Structuration patrimoniale
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-2.5 max-w-[680px]">
              Structurer, pas seulement placer.
            </h2>
            <p className="text-warm-grey text-[14.5px] max-w-[640px] mb-6 leading-[1.65]">
              Création de sociétés patrimoniales, apport de biens immobiliers en nature, gestion comptable déléguée - un conseil de structuration avant toute mise en œuvre par un professionnel du réseau.
            </p>
            <Link
              href="/conseil/structuration"
              className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
            >
              Découvrir la structuration →
            </Link>
          </AnimateIn>
          <AnimateIn delay={150}>
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
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Confiance &amp; confidentialité
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-6 max-w-[680px]">
              Un conseil indépendant, une pédagogie exigeante
            </h2>
          </AnimateIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[22px]">
            {trustCards.map((t, i) => (
              <AnimateIn key={t.title} delay={i * 100}>
                <div className="bg-white p-[26px] border border-cream-deep h-full rounded-lg">
                  <h4 className="text-[16.5px] font-semibold mb-2">{t.title}</h4>
                  <p className="text-[13px] text-warm-grey leading-[1.6]">{t.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              FAQ
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-6 max-w-[680px]">
              Vos questions, nos réponses
            </h2>
          </AnimateIn>
          <div>
            {faqs.map((faq, i) => (
              <AnimateIn key={i} delay={i * 80}>
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
