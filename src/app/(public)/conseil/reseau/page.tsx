import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NetworkOrbit } from "@/components/public/network-orbit";
import { CtaBand } from "@/components/public/cta-band";
import { AnimateIn } from "@/components/ui/animate-in";
import { METIERS } from "@/lib/reseau";
import { PartenariatForm } from "./partenariat-form";

export default function ReseauPage() {
  const sourcing = METIERS.filter((m) => m.cercle === "sourcing");

  return (
    <>
      <section className="bg-ink text-cream">
        <div className="shell pt-10 pb-20 lg:pt-14 lg:pb-32">
          <nav aria-label="Fil d’Ariane" className="text-[14px] text-cream-muted">
            <Link href="/" className="hover:text-cream transition-colors">Accueil</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span className="text-cream">Notre réseau</span>
          </nav>
          <div className="mt-10 lg:mt-16 grid gap-8 lg:grid-cols-2 lg:items-end mb-14 lg:mb-20">
            <AnimateIn variant="fade-up" duration={1}>
              <h1 className="display-xl text-cream max-w-[12ch]">Un point d’entrée, tout un réseau.</h1>
            </AnimateIn>
            <AnimateIn variant="fade-up" delay={150}>
              <p className="max-w-[46ch] text-[18px] leading-relaxed text-cream-muted lg:justify-self-end">
                Sociétés de gestion, assureurs, agents immobiliers, fonds de private equity et de venture capital pour
                les opportunités ; notaires, experts-comptables et avocats fiscalistes pour la mise en œuvre. Nous les
                sélectionnons et les coordonnons pour vous.
              </p>
            </AnimateIn>
          </div>
          <NetworkOrbit />
        </div>
      </section>

      <section className="shell section-y">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <h2 className="display-lg text-ink max-w-[14ch]">Cinq réseaux, mobilisés selon la classe d’actifs.</h2>
            <p className="lead mt-6 max-w-[42ch]">
              Nous ne créons pas les opportunités, nous les sélectionnons. Ce réseau nourrit nos recommandations, il ne
              les remplace pas.
            </p>
            <Link href="/conseil/structuration" className="link-arrow mt-8">
              Le réseau de mise en œuvre <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ol className="border-t border-ink/10">
            {sourcing.map((m, i) => (
              <li key={m.title}>
                <AnimateIn variant="fade-up" delay={i * 60}>
                  <div className="border-b border-ink/10 py-8">
                    <div>
                      <h3 className="display-md text-ink">{m.title}</h3>
                      <p className="mt-3 max-w-[50ch] text-[17px] leading-relaxed text-charcoal">{m.desc}</p>
                    </div>
                  </div>
                </AnimateIn>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell pb-12 lg:pb-16">
        <div className="panel px-6 py-14 sm:px-12 lg:px-16 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <h2 className="display-lg text-ink">Vous êtes un acteur spécialisé ?</h2>
              <p className="lead mt-6 max-w-[40ch]">
                Société de gestion, assureur, agent immobilier, fonds de private equity ou de venture capital, porteur
                d’un partenariat : sélectionnez votre catégorie. Nous étudions chaque proposition et la présentons
                de façon sélective à nos clients.
              </p>
            </div>
            <div className="rounded-[24px] bg-white p-6 sm:p-10">
              <PartenariatForm />
            </div>
          </div>
        </div>
      </section>

      <CtaBand title="Une opportunité qui correspond à votre profil ?" label="Prendre rendez-vous" />
    </>
  );
}
