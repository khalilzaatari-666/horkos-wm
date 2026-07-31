import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";

const etapes = [
  {
    n: "1",
    badge: "Gratuit",
    title: "Diagnostic patrimonial",
    desc: "Premier rendez-vous d'exploration : nous comprenons votre situation et vos objectifs. Aucun engagement, aucun frais — pour tout le monde, à chaque fois.",
  },
  {
    n: "2",
    badge: "Commissions",
    title: "Structuration et investissement",
    desc: "Nous structurons votre patrimoine et vous orientons vers notre réseau de professionnels pour le mettre en œuvre, avec des solutions d'investissement. Vous payez uniquement des commissions sur les opérations réalisées.",
  },
  {
    n: "3",
    badge: "Honoraires",
    title: "Structuration seule (conseil)",
    desc: "Si votre besoin est uniquement un conseil en structuration patrimoniale, sans investissement associé, nous sommes rémunérés par des honoraires de conseil, clairement définis en amont.",
  },
];

export default function ModelePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ink text-cream pt-[50px] pb-[36px]">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="inline-block bg-cream/[0.08] border border-cream/[0.18] text-bronze-light text-[11px] font-semibold tracking-[1.5px] uppercase px-3.5 py-1.5 mb-4">
              Transparence
            </span>
            <h1 className="text-[30px] font-medium text-cream max-w-[660px] leading-[1.3]">
              Comment Horkos est rémunéré.
            </h1>
            <p className="text-[#D8CDBC] max-w-[620px] mt-3.5 text-[14.5px] leading-[1.7]">
              Le premier rendez-vous est toujours gratuit. Ce qui se passe ensuite dépend uniquement de ce que vous décidez — jamais de frais cachés, jamais deux catégories de frais à la fois.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Trois étapes */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-7">
          <AnimateIn>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Trois étapes, une seule règle : jamais de cumul
            </span>
          </AnimateIn>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {etapes.map((e, i) => (
              <AnimateIn key={e.n} delay={i * 120}>
                <div className="group border border-ink/[0.08] rounded-lg p-7 h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:border-bronze/30">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-heading text-[32px] text-bronze font-semibold leading-none">{e.n}</span>
                    <span className="inline-block bg-bronze/10 text-bronze text-[11px] font-semibold tracking-[1px] uppercase px-2.5 py-1 rounded-md">
                      {e.badge}
                    </span>
                  </div>
                  <h3 className="text-[17px] font-semibold mb-2.5">{e.title}</h3>
                  <p className="text-[14px] text-warm-grey leading-[1.65] flex-1">{e.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>

          {/* Équation */}
          <AnimateIn delay={400}>
            <div className="mt-10 text-center">
              <div className="font-heading text-[28px] font-medium text-ink">
                1 + 2 <span className="text-bronze mx-2">ou</span> 1 + 3
              </div>
              <div className="font-heading text-[20px] text-warm-grey italic mt-1">
                Jamais 1 + 2 + 3
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Principe */}
      <section className="bg-ink text-cream py-16">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <AnimateIn>
            <span className="text-bronze-light text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Notre principe
            </span>
            <h2 className="text-[27px] font-semibold mt-2.5 mb-6 text-cream mx-auto max-w-[680px]">
              Le client ne paie jamais deux fois
            </h2>
            <div className="bg-cream/[0.06] border border-cream/[0.12] rounded-lg p-7 max-w-[700px] mx-auto text-left text-[14.5px] leading-[1.7] text-[#D8CDBC]">
              <strong className="text-cream">Le diagnostic patrimonial est toujours gratuit.</strong><br />
              Selon la recommandation qui en découle, vous êtes facturés soit en commission sur vos opérations d&apos;investissement, soit en honoraires de conseil en structuration — jamais les deux sur le même besoin.
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-cream-deep">
        <div className="max-w-[1200px] mx-auto px-7 text-center">
          <AnimateIn>
            <h2 className="text-[27px] font-semibold mx-auto max-w-[680px]">
              Prêt à commencer par un diagnostic gratuit ?
            </h2>
            <Link
              href="/rendez-vous"
              className="inline-block mt-4 px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-ink text-cream hover:bg-navy transition-colors rounded-lg"
            >
              Prendre rendez-vous →
            </Link>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
