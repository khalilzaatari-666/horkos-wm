import { PageHero } from "@/components/public/page-hero";
import { TocRail } from "@/components/public/toc-rail";
import { StructureDiagram } from "@/components/public/structure-diagram";
import { CtaBand } from "@/components/public/cta-band";
import { AnimateIn } from "@/components/ui/animate-in";

const processSteps = [
  {
    title: "Conseil en structuration",
    desc: "Nous analysons votre situation et concevons le montage le plus adapté : société, apport, régime fiscal.",
  },
  {
    title: "Orientation vers le réseau",
    desc: "Nous vous mettons en relation avec l’expert-comptable, le notaire ou l’avocat fiscaliste adapté à votre dossier.",
  },
  {
    title: "Implémentation et suivi",
    desc: "Le professionnel met en œuvre, nous restons impliqués dans le suivi et la gouvernance.",
  },
];

const services = [
  { title: "Création de société", desc: "Holding, SCI, SARL immobilière." },
  { title: "Apport en nature", desc: "Un expert valorisateur pour intégrer un bien au capital." },
  { title: "Gestion comptable déléguée", desc: "Un expert-comptable du réseau prend en charge la tenue comptable." },
  { title: "Structuration fiscale", desc: "Un avocat fiscaliste sécurise le montage." },
];

const apportSteps = [
  "Vous détenez un bien immobilier en nom propre",
  "Un expert valorisateur évalue le bien",
  "Le bien est apporté au capital d’une SARL immobilière",
  "Un expert-comptable gère la société",
  "Un notaire formalise l’apport",
];

const SECTIONS = [
  { id: "role", label: "Notre rôle" },
  { id: "briques", label: "Quatre briques" },
  { id: "apport", label: "Apporter un bien à une société" },
];

export default function StructurationPage() {
  return (
    <>
      <PageHero
        tag="Structuration patrimoniale"
        title="Structurer votre patrimoine, pas seulement le placer."
        subtitle="Horkos conçoit la structuration de vos sociétés patrimoniales et mobilise les professionnels du réseau pour la mettre en œuvre : experts-comptables, experts valorisateurs, avocats fiscalistes, notaires."
        image="/images/pages/structuration-assemblage.jpg"
      />

      <div className="shell grid gap-12 pb-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20">
        <TocRail items={SECTIONS} />

        <div className="min-w-0 space-y-24 lg:space-y-36">
          <section id="role" className="scroll-mt-32">
            <h2 className="display-lg text-ink max-w-[16ch]">D’abord le conseil, ensuite l’implémentation.</h2>
            <p className="lead mt-6 max-w-[58ch]">
              Nous ne sommes ni comptables, ni notaires, ni avocats. Notre rôle est de concevoir la stratégie de
              structuration la plus adaptée à votre situation, puis de vous orienter vers le bon professionnel du réseau
              pour la mettre en œuvre.
            </p>
            <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {processSteps.map((s, i) => (
                <li key={s.title}>
                  <AnimateIn variant="fade-up" delay={i * 100}>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-full bg-ink text-[14px] font-medium text-white">
                        {i + 1}
                      </span>
                      <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
                    </div>
                    <h3 className="display-sm mt-6 text-ink">{s.title}</h3>
                    <p className="mt-3 text-[16px] leading-relaxed text-charcoal">{s.desc}</p>
                  </AnimateIn>
                </li>
              ))}
            </ol>
          </section>

          <section id="briques" className="scroll-mt-32">
            <h2 className="display-lg text-ink">Quatre briques de structuration.</h2>
            <ul className="mt-12 grid gap-x-10 sm:grid-cols-2">
              {services.map((s, i) => (
                <li key={s.title} className="border-t border-ink/10 py-8">
                  <AnimateIn variant="fade-up" delay={i * 80}>
                    <h3 className="display-md text-ink">{s.title}</h3>
                    <p className="mt-3 text-[16px] leading-relaxed text-charcoal">{s.desc}</p>
                  </AnimateIn>
                </li>
              ))}
            </ul>
          </section>

          <section id="apport" className="scroll-mt-32">
            <h2 className="display-lg text-ink max-w-[18ch]">Intégrer un bien immobilier dans une société.</h2>
            <p className="lead mt-6 max-w-[58ch]">
              Le cas le plus fréquent. La détention via société facilite la transmission par cession de parts, permet
              une gestion comptable rigoureuse, et ouvre des options fiscales non disponibles en direct.
            </p>
            <div className="mt-12">
              <StructureDiagram
                before={{
                  title: "Aujourd’hui",
                  chain: [{ label: "Vous" }, { label: "Bien immobilier", sub: "détenu en nom propre" }],
                }}
                after={{
                  title: "Après structuration",
                  chain: [
                    { label: "Vous", sub: "associé" },
                    { label: "SARL immobilière", sub: "détient le bien", tone: "key" },
                    { label: "Bien immobilier", sub: "apporté au capital" },
                  ],
                  aside: [
                    { label: "Expert valorisateur", sub: "évalue" },
                    { label: "Notaire", sub: "formalise" },
                    { label: "Expert-comptable", sub: "gère" },
                  ],
                }}
              />
            </div>
            <ol className="mt-12 grid gap-x-10 sm:grid-cols-2">
              {apportSteps.map((s, i) => (
                <li key={s} className="flex gap-4 border-t border-ink/10 py-5">
                  <span className="text-[14px] tabular-nums text-warm-grey pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[17px] leading-snug text-ink">{s}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <CtaBand title="Une situation à structurer ?" label="Prendre rendez-vous" />
    </>
  );
}
