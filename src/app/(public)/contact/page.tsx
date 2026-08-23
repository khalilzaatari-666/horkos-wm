import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";
import { CABINET_EMAIL, CABINET_ADDRESS } from "@/lib/site";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact | Horkos Wealth Management",
  description:
    "Une question, une idée ou un projet ? Écrivez au cabinet Horkos Wealth Management. Notre équipe vous répond dans les meilleurs délais.",
};

export default function ContactPage() {
  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-[680px] mx-auto px-7">
        <div className="text-center mb-8">
          <AnimateIn variant="blur-in" duration={0.5}>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Nous contacter
            </span>
          </AnimateIn>
          <SplitHeading
            text="Contactez-nous"
            as="h1"
            className="text-[clamp(1.8rem,4.2vw,2.2rem)] font-semibold text-ink mt-2.5 leading-[1.25]"
            delay={150}
          />
          <AnimateIn variant="fade-up" delay={350}>
            <p className="text-warm-grey text-[14px] mt-2.5 leading-[1.6]">
              Une question, une idée ou un projet ? N&apos;hésitez pas à nous écrire.
            </p>
          </AnimateIn>
        </div>

        {/* Le formulaire n'est pas enveloppé dans une animation d'entrée : c'est le
            contenu essentiel, il doit toujours être visible, et un transform de
            wrapper casserait le positionnement absolu du sélecteur de pays. */}
        <ContactForm />

        {/* Coordonnées directes, pour qui préfère écrire ou passer. */}
        <div className="mt-8 pt-8 border-t border-cream-deep flex flex-col sm:flex-row gap-4 sm:gap-10 justify-center text-center sm:text-left">
          <a
            href={`mailto:${CABINET_EMAIL}`}
            className="inline-flex items-center justify-center sm:justify-start gap-2.5 text-[13.5px] text-charcoal hover:text-bronze transition-colors"
          >
            <Mail className="w-4 h-4 text-bronze shrink-0" aria-hidden="true" />
            {CABINET_EMAIL}
          </a>
          <span className="inline-flex items-center justify-center sm:justify-start gap-2.5 text-[13.5px] text-charcoal">
            <MapPin className="w-4 h-4 text-bronze shrink-0" aria-hidden="true" />
            {CABINET_ADDRESS}
          </span>
        </div>
      </div>
    </div>
  );
}
