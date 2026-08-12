import type { Metadata } from "next";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";
import { RdvForm } from "./rdv-form";

export const metadata: Metadata = {
  title: "Prendre rendez-vous | Horkos Wealth Management",
  description:
    "Quelques questions pour préparer notre échange. Le premier rendez-vous est gratuit et sans engagement.",
};

export default function RendezVousPage() {
  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-[640px] mx-auto px-7">
        <div className="text-center mb-8">
          <AnimateIn variant="blur-in" duration={0.5}>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Avant de nous rencontrer
            </span>
          </AnimateIn>
          <SplitHeading
            text="Faisons connaissance en quelques questions."
            as="h1"
            className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold text-ink mt-2.5 leading-[1.3]"
            delay={150}
          />
          <AnimateIn variant="fade-up" delay={350}>
            <p className="text-warm-grey text-[14px] mt-2.5">2 minutes, rien de plus.</p>
          </AnimateIn>
        </div>

        <RdvForm />
      </div>
    </div>
  );
}
