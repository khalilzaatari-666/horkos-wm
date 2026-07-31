import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";

const processSteps = [
  {
    n: "01",
    title: "Conseil en structuration",
    desc: "Nous analysons votre situation et concevons le montage le plus adapté — société, apport, régime fiscal.",
  },
  {
    n: "02",
    title: "Orientation vers le réseau",
    desc: "Nous vous mettons en relation avec l'expert-comptable, le notaire ou l'avocat fiscaliste adapté à votre dossier.",
  },
  {
    n: "03",
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

export default function StructurationPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-cream pt-[50px] pb-[36px]">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="inline-block bg-cream/[0.08] border border-cream/[0.18] text-bronze-light text-[11px] font-semibold tracking-[1.5px] uppercase px-3.5 py-1.5 mb-4">
              Structuration & création de sociétés
            </span>
            <h1 className="text-[30px] font-medium text-cream max-w-[660px] leading-[1.3]">
              Structurer votre patrimoine, pas seulement le placer.
            </h1>
            <p className="text-[#D8CDBC] max-w-[620px] mt-3.5 text-[14.5px] leading-[1.7]">
              Horkos crée et structure des sociétés patrimoniales pour ses clients en mobilisant les professionnels du réseau : comptables, experts valorisateurs, avocats fiscalistes, notaires.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Notre rôle — process */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Notre rôle
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-3">
              D&apos;abord le conseil, ensuite l&apos;implémentation
            </h2>
            <p className="text-[14.5px] text-warm-grey max-w-[680px] leading-[1.7] mb-8">
              Nous ne sommes ni comptables, ni notaires, ni avocats. Notre rôle est de concevoir la stratégie de structuration la plus adaptée à votre situation, puis de vous orienter vers le bon professionnel du réseau pour la mettre en œuvre.
            </p>
          </AnimateIn>

          <div className="grid md:grid-cols-3 gap-6">
            {processSteps.map((s, i) => (
              <AnimateIn key={s.n} delay={i * 120}>
                <div className="bg-cream rounded-lg p-7 h-full border border-cream-deep transition-all duration-300 hover:shadow-md">
                  <div className="font-heading text-[28px] text-bronze font-semibold mb-3">{s.n}</div>
                  <h3 className="text-[16.5px] font-semibold mb-2">{s.title}</h3>
                  <p className="text-[14px] text-warm-grey leading-[1.65]">{s.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Quatre briques */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Nos services
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-8">
              Quatre briques de structuration
            </h2>
          </AnimateIn>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {services.map((s, i) => (
              <AnimateIn key={s.title} delay={i * 100}>
                <div className="bg-white rounded-lg p-6 h-full border border-ink/[0.06] transition-all duration-300 hover:shadow-md">
                  <h4 className="text-[15px] font-semibold mb-2">{s.title}</h4>
                  <p className="text-[13.5px] text-warm-grey leading-[1.6]">{s.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Cas d'usage — Apport immobilier */}
      <section className="bg-ink text-cream py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimateIn>
              <div>
                <span className="text-bronze-light text-[11.5px] font-semibold tracking-[1.8px] uppercase">
                  Cas d&apos;usage fréquent
                </span>
                <h2 className="text-[27px] font-semibold mt-2.5 mb-6 text-cream">
                  Intégrer un bien immobilier dans une société
                </h2>
                <ul className="space-y-3">
                  {apportSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-bronze/20 text-bronze text-[11px] font-semibold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-[14.5px] text-[#D8CDBC] leading-[1.6]">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>

            <AnimateIn delay={150}>
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
          <AnimateIn>
            <h2 className="text-[27px] font-semibold mx-auto max-w-[680px]">
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
