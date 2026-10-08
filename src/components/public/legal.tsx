import { Fragment, type ReactNode } from "react";
import { AnimateIn } from "@/components/ui/animate-in";

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
    <div className="shell pt-8 pb-20 lg:pt-12 lg:pb-28">
      <p className="text-[14px] text-warm-grey">{eyebrow}</p>
      <AnimateIn variant="fade-up" duration={1}>
        <h1 className="display-lg mt-10 max-w-[20ch] text-ink lg:mt-16">{title}</h1>
      </AnimateIn>
      <p className="mt-6 border-t border-ink/10 pt-6 text-[14px] text-warm-grey">Dernière mise à jour : {updatedAt}</p>

      <div className="mt-14 max-w-[760px] space-y-14 lg:ml-[calc(100%-760px)]">{children}</div>
    </div>
  );
}

/** Une section : un titre et son contenu, avec un interligne confortable. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="display-sm text-ink mb-5">{title}</h2>
      <div className="space-y-4 text-[16px] leading-[1.75] text-charcoal">{children}</div>
    </section>
  );
}

/** Liste à puces alignée sur la même typographie que les paragraphes. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 marker:text-warm-grey">
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
          <dt className="text-[14px] text-warm-grey">{key}</dt>
          <dd className="text-[16px] text-ink">{value}</dd>
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
    <span className="inline-block rounded border border-ink bg-ink/10 px-1.5 py-0.5 text-[12.5px] font-medium text-ink">
      À compléter : {children}
    </span>
  );
}
