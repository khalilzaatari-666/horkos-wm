import type { Metadata } from "next";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { ConciergeAside } from "@/components/public/concierge-aside";
import { RdvForm } from "./rdv-form";

export const metadata: Metadata = {
  title: "Prendre rendez-vous | Horkos Wealth Management",
  description:
    "Quelques questions pour préparer notre échange. Le premier rendez-vous est gratuit et sans engagement.",
};

export default function RendezVousPage() {
  return (
    <div className="shell pt-8 pb-20 lg:pt-12 lg:pb-28">
      <nav aria-label="Fil d’Ariane" className="text-[14px] text-warm-grey">
        <Link href="/" className="hover:text-ink transition-colors">Accueil</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span className="text-ink">Prendre rendez-vous</span>
      </nav>

      <div className="mt-10 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-16">
        <div>
          <AnimateIn variant="fade-up" duration={1}>
            <p className="tag">Premier échange · gratuit et sans engagement</p>
            <h1 className="display-lg mt-6 text-ink">Faisons connaissance en quelques questions.</h1>
            <p className="lead mt-5 max-w-[48ch]">Deux minutes, rien de plus. Elles nous permettent de préparer notre échange.</p>
          </AnimateIn>

          {/* Le formulaire porte déjà sa propre carte : pas d'enveloppe en plus. */}
          <div className="mt-10">
            <RdvForm />
          </div>
        </div>

        <ConciergeAside />
      </div>
    </div>
  );
}
