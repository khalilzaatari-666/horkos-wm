import { Fragment, type ReactNode } from "react";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";

/**
 * Gabarit commun aux pages légales (mentions légales, confidentialité).
 *
 * Seul l'en-tête est animé : le corps, long, reste en clair. Une animation
 * d'entrée sur un bloc de texte de cette taille laisserait la page vide tant
 * que le scroll-trigger ne s'est pas déclenché (même écueil que le formulaire
 * de contact) - le contenu légal doit, lui, toujours être lisible.
 */
export function LegalPage({
  eyebrow,
  title,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-[760px] mx-auto px-7">
        <div className="mb-9">
          <AnimateIn variant="blur-in" duration={0.5}>
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              {eyebrow}
            </span>
          </AnimateIn>
          <SplitHeading
            text={title}
            as="h1"
            className="text-[clamp(1.7rem,4vw,2.1rem)] font-semibold text-ink mt-2.5 leading-[1.25]"
            delay={150}
          />
          <AnimateIn variant="fade-up" delay={350}>
            <p className="text-warm-grey text-[12.5px] mt-3">Dernière mise à jour : {updatedAt}</p>
          </AnimateIn>
        </div>

        <div className="space-y-9">{children}</div>
      </div>
    </div>
  );
}

/** Une section : un titre et son contenu, avec un interligne confortable. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-heading text-[20px] font-semibold text-ink mb-3.5">{title}</h2>
      <div className="space-y-3.5 text-[14px] leading-[1.75] text-charcoal">{children}</div>
    </section>
  );
}

/** Liste à puces alignée sur la même typographie que les paragraphes. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 marker:text-bronze">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Bloc « clé : valeur » pour l'identité de l'éditeur et le responsable de traitement. */
export function LegalFacts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid sm:grid-cols-[190px_1fr] gap-x-6 gap-y-2.5">
      {items.map(([key, value], i) => (
        <Fragment key={i}>
          <dt className="text-[13px] font-medium text-warm-grey">{key}</dt>
          <dd className="text-[14px] text-charcoal">{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/**
 * Marque une information que seul le cabinet (ou son conseil juridique) peut
 * fournir - numéro RC, ICE, capital social, etc. Visuellement distincte pour
 * qu'aucun placeholder ne parte en production par inadvertance.
 */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded border border-bronze/30 bg-bronze/10 px-1.5 py-0.5 text-[12.5px] font-medium text-bronze-dark">
      À compléter : {children}
    </span>
  );
}
