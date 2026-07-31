import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";

const principes = [
  { n: "01", title: "Partir de votre besoin" },
  { n: "02", title: "Expliquer, sans raccourci" },
  { n: "03", title: "Sélectionner ce qui sert l'objectif" },
  { n: "04", title: "Décider ensemble" },
  { n: "05", title: "Rester dans la durée" },
];

const philosophie = [
  { n: "01", title: "Nous partons de votre objectif", desc: "Aucune recommandation n'est faite avant d'avoir clarifié ce que vous cherchez réellement à accomplir." },
  { n: "02", title: "Nous coordonnons, jamais seuls", desc: "Chaque structuration mobilise des métiers spécialisés - nous les orchestrons pour vous." },
  { n: "03", title: "Nous restons impliqués après la décision", desc: "Notre rôle ne s'arrête pas à la signature." },
];

export default function ApprochePage() {
  return (
    <>
{/* Hero */}
      <section className="bg-ink text-cream pt-[50px] pb-[36px]">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="inline-block bg-cream/[0.08] border border-cream/[0.18] text-bronze-light text-[11px] font-semibold tracking-[1.5px] uppercase px-3.5 py-1.5 mb-4">
              Notre approche
            </span>
            <h1 className="text-[30px] font-medium text-cream max-w-[660px] leading-[1.3]">
              Comprendre. Structurer. Décider avec clarté.
            </h1>
            <p className="text-[#D8CDBC] max-w-[560px] mt-3.5 text-[14.5px] leading-[1.7]">
              Cinq principes qui guident chaque accompagnement, du premier échange au suivi dans la durée.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Méthode strip */}
      <section className="pt-9 pb-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-1.5">
            {principes.map((p, i) => (
              <AnimateIn key={p.n} delay={i * 100}>
                <div className="group border-t-2 border-bronze pt-5 pb-6 rounded-lg cursor-default transition-all duration-300 hover:bg-cream hover:shadow-md hover:scale-[1.06] hover:z-10 relative">
                  <div className="font-heading text-[20px] text-bronze font-semibold transition-transform duration-300 group-hover:translate-x-1.5">{p.n}</div>
                  <h4 className="text-[13px] mt-1.5 leading-[1.35] font-medium transition-transform duration-300 group-hover:translate-x-1.5">{p.title}</h4>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophie */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Notre philosophie
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-6 max-w-[680px]">
              On ne vend pas de produits. On structure un patrimoine.
            </h2>
          </AnimateIn>
          <div>
            {philosophie.map((p, i) => (
              <AnimateIn key={p.n} delay={i * 100}>
                <div className={`grid grid-cols-[56px_1fr] gap-[26px] py-6 border-t border-ink/[0.08] ${i === philosophie.length - 1 ? "border-b" : ""}`}>
                  <div className="font-heading text-[26px] text-bronze font-medium">{p.n}</div>
                  <div>
                    <h3 className="text-[16.5px] font-semibold mb-1.5">{p.title}</h3>
                    <p className="text-[14px] text-warm-grey max-w-[560px] leading-[1.6]">{p.desc}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <AnimateIn>
            <h2 className="text-[27px] font-semibold mx-auto max-w-[680px]">
              Voir cette méthode appliquée à des cas réels
            </h2>
            <Link
              href="/conseil/cas-usage"
              className="inline-block mt-4 px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
            >
              Consulter nos cas d&apos;usage →
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
