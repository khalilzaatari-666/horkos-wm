import { Check } from "lucide-react";
import { PageHero } from "@/components/public/page-hero";
import { CtaBand } from "@/components/public/cta-band";
import { AnimateIn } from "@/components/ui/animate-in";

const etapes = [
  {
    n: "1",
    title: "Diagnostic patrimonial",
    price: "Gratuit",
    note: "Pour tout le monde, à chaque fois",
    desc: "Premier rendez-vous d’exploration : nous comprenons votre situation et vos objectifs. Aucun engagement, aucun frais.",
  },
  {
    n: "2",
    title: "Structuration et investissement",
    price: "Commissions",
    note: "Uniquement sur les opérations réalisées",
    desc: "Nous structurons votre patrimoine et vous orientons vers notre réseau de professionnels pour le mettre en œuvre, avec des solutions d’investissement.",
  },
  {
    n: "3",
    title: "Structuration seule (conseil)",
    price: "Honoraires",
    note: "Clairement définis en amont",
    desc: "Si votre besoin est uniquement un conseil en structuration patrimoniale, sans investissement associé, nous sommes rémunérés par des honoraires de conseil.",
  },
];

export default function ModelePage() {
  return (
    <>
      <PageHero
        tag="Notre modèle"
        title="Comment Horkos est rémunéré."
        subtitle="Le premier rendez-vous est toujours gratuit. Ce qui se passe ensuite dépend uniquement de ce que vous décidez : jamais de frais cachés, jamais deux catégories de frais à la fois."
        image="/images/pages/modele-salon.jpg"
      />

      <section className="shell pb-20 lg:pb-32">
        <div className="grid gap-4 lg:grid-cols-3">
          {etapes.map((e, i) => {
            const featured = i === 0;
            return (
              <AnimateIn key={e.n} variant="fade-up" delay={i * 120} className="h-full">
                <article
                  className={`flex h-full flex-col rounded-[24px] p-8 lg:p-10 ${
                    featured ? "bg-ink text-cream" : "surface"
                  }`}
                >
                  <p className={`text-[14px] ${featured ? "text-cream-muted" : "text-warm-grey"}`}>Étape {e.n}</p>
                  <h2 className={`mt-2 font-sans text-[18px] font-medium tracking-normal ${featured ? "text-cream" : "text-ink"}`}>
                    {e.title}
                  </h2>
                  <p className={`mt-10 font-heading font-light text-[clamp(2.2rem,3.2vw,2.9rem)] leading-none tracking-[-0.03em] ${featured ? "text-cream" : "text-ink"}`}>
                    {e.price}
                  </p>
                  <p className={`mt-3 flex items-center gap-2 text-[15px] ${featured ? "text-cream-muted" : "text-ink"}`}>
                    <Check className="size-4" aria-hidden="true" /> {e.note}
                  </p>
                  <p className={`mt-8 border-t pt-6 text-[16px] leading-relaxed ${featured ? "border-cream/15 text-cream-muted" : "border-ink/10 text-charcoal"}`}>
                    {e.desc}
                  </p>
                </article>
              </AnimateIn>
            );
          })}
        </div>
      </section>

      <section className="shell pb-12 lg:pb-16">
        <div className="panel relative overflow-hidden px-6 py-16 sm:px-12 lg:px-16 lg:py-24">
          <span
            aria-hidden="true"
            className="pointer-events-none select-none absolute -right-[3%] -top-[34%] font-heading font-light leading-none text-[clamp(16rem,34vw,30rem)] text-white/45"
          >
            H
          </span>
          <div className="relative grid gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div>
              <p aria-label="Étape 1 puis 2, ou étape 1 puis 3" className="font-heading font-light text-[clamp(3rem,6.5vw,6rem)] leading-[0.95] tracking-[-0.04em] text-ink">
                <span className="block">1 + 2</span>
                <span className="block text-ink text-[0.45em] my-3 tracking-[-0.01em]">ou</span>
                <span className="block">1 + 3</span>
              </p>
              <p className="mt-8 font-heading text-[clamp(1.4rem,2.4vw,2rem)] text-warm-grey line-through decoration-1">
                Jamais 1 + 2 + 3
              </p>
            </div>
            <div>
              <h2 className="display-lg text-ink">Le client ne paie jamais deux fois.</h2>
              <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-charcoal">
                <strong className="font-medium text-ink">Le diagnostic patrimonial est toujours gratuit.</strong> Selon la
                recommandation qui en découle, vous êtes facturé soit en commission sur vos opérations
                d’investissement, soit en honoraires de conseil en structuration, jamais les deux sur le même besoin.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CtaBand title="Prêt à commencer par un diagnostic gratuit ?" label="Prendre rendez-vous" />
    </>
  );
}
