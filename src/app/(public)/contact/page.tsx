import type { Metadata } from "next";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { ConciergeAside } from "@/components/public/concierge-aside";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact | Horkos Wealth Management",
  description:
    "Une question, une idée ou un projet ? Écrivez au cabinet Horkos Wealth Management. Notre équipe vous répond dans les meilleurs délais.",
};

export default function ContactPage() {
  return (
    <div className="shell pt-8 pb-20 lg:pt-12 lg:pb-28">
      <nav aria-label="Fil d’Ariane" className="text-[14px] text-warm-grey">
        <Link href="/" className="hover:text-ink transition-colors">Accueil</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span className="text-ink">Contact</span>
      </nav>

      <div className="mt-10 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-16">
        <div>
          <AnimateIn variant="fade-up" duration={1}>
            <h1 className="display-lg text-ink">Écrivez-nous.</h1>
            <p className="lead mt-5 max-w-[48ch]">
              Une question, une idée ou un projet ? Nous vous répondons dans les meilleurs délais.
            </p>
          </AnimateIn>

          {/* Le formulaire n'est pas enveloppé dans une animation d'entrée : c'est le
              contenu essentiel, il doit toujours être visible, et un transform de
              wrapper casserait le positionnement absolu du sélecteur de pays. */}
          <div className="mt-10 surface p-6 sm:p-10">
            <ContactForm />
          </div>
        </div>

        <ConciergeAside />
      </div>
    </div>
  );
}
