import { PageHero } from "@/components/public/page-hero";
import { PinnedSteps } from "@/components/public/pinned-steps";
import { RevealImage } from "@/components/public/reveal-image";
import { CtaBand } from "@/components/public/cta-band";
import { InkRise } from "@/components/ui/ink-rise";
import { AnimateIn } from "@/components/ui/animate-in";
import { FragQuestionnaire, FragReco, FragRevue } from "@/components/public/ui-fragments";
import { PARCOURS } from "@/lib/parcours";

const principes = [
  "Partir de votre besoin",
  "Expliquer, sans raccourci",
  "Sélectionner ce qui sert l’objectif",
  "Décider ensemble",
  "Rester dans la durée",
];

const philosophie = [
  { title: "Nous partons de votre objectif", desc: "Aucune recommandation n’est faite avant d’avoir clarifié ce que vous cherchez réellement à accomplir." },
  { title: "Nous coordonnons, jamais seuls", desc: "Chaque structuration mobilise des métiers spécialisés : nous les orchestrons pour vous." },
  { title: "Nous restons impliqués après la décision", desc: "Notre rôle ne s’arrête pas à la signature." },
];

const fragments = [<FragQuestionnaire key="r0" />, <FragReco key="r1" />, <FragRevue key="r2" />];

export default function ApprochePage() {
  return (
    <>
      <PageHero
        tag="Notre approche"
        title="Comprendre. Structurer. Décider avec clarté."
        subtitle="Cinq principes qui guident chaque accompagnement, du premier échange au suivi dans la durée."
        image="/images/pages/approche-hero.jpg"
        anchors={[
          { href: "#principes", label: "Les principes" },
          { href: "#parcours", label: "Le parcours" },
          { href: "#philosophie", label: "La philosophie" },
        ]}
      />

      <section id="principes" className="shell pb-16 lg:pb-24 scroll-mt-28">
        <div className="grid gap-10 border-t border-ink/10 pt-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:pt-14">
          <h2 className="display-md max-w-[14ch] text-ink lg:sticky lg:top-32 lg:self-start">
            Cinq principes, pour chaque accompagnement.
          </h2>
          <ol>
            {principes.map((p, i) => (
              <li key={p}>
                <AnimateIn variant="fade-up" delay={i * 60}>
                  <div className={`flex items-baseline gap-6 border-ink/10 ${i ? "border-t py-5 lg:py-6" : "pb-5 lg:pb-6"}`}>
                    <span className="w-6 shrink-0 text-[14px] tabular-nums text-warm-grey">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-heading text-[clamp(1.2rem,1.7vw,1.5rem)] leading-snug text-ink">{p}</span>
                  </div>
                </AnimateIn>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div id="parcours" className="scroll-mt-20">
        <PinnedSteps
          intro={
            <>
              <h2 className="display-lg text-ink">Un parcours en trois jalons.</h2>
              <p className="lead mt-6 max-w-[38ch]">
                Chaque rendez-vous porte un nom, un contenu et un livrable. Vous savez toujours où vous en êtes.
              </p>
            </>
          }
          steps={PARCOURS.map((e, i) => ({ mark: e.type, title: e.title, desc: e.desc, fragment: fragments[i] }))}
        />
      </div>

      <InkRise id="philosophie" className="text-cream scroll-mt-20">
        <div className="shell section-y grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2 className="display-lg text-cream max-w-[14ch]">On ne vend pas de produits. On structure un patrimoine.</h2>
            <RevealImage
              src="/images/pages/approche-carnet.jpg"
              alt=""
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="mt-12 aspect-[4/3] lg:aspect-[5/4]"
            />
          </div>
          <ul className="divide-y divide-cream/12 border-y border-cream/12 lg:mt-40">
            {philosophie.map((p) => (
              <li key={p.title} className="py-10">
                <h3 className="display-md text-cream">{p.title}</h3>
                <p className="mt-4 max-w-[44ch] text-[17px] leading-relaxed text-cream-muted">{p.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </InkRise>

      <CtaBand
        title="Voir cette méthode appliquée à des cas réels."
        label="Consulter nos cas d’usage"
        href="/conseil/cas-usage"
      />
    </>
  );
}
