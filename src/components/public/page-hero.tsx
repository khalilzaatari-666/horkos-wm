import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { RevealImage } from "./reveal-image";

interface PageHeroProps {
  /** Nom de la rubrique, affiché en fil d'Ariane. */
  tag: string;
  title: string;
  subtitle: string;
  /** Photographie en panneau à droite (variante « split »). */
  image?: string;
  imagePosition?: string;
  /** Ancres vers les sections de la page, en pastilles. */
  anchors?: { href: string; label: string }[];
  children?: React.ReactNode;
}

/**
 * L'ouverture de chaque page intérieure.
 *
 * Avec une image : le titre à gauche, la photographie en panneau à droite.
 * Sans image : le titre en très grand à gauche, le sous-titre et les ancres
 * à droite, alignés sur sa dernière ligne.
 */
export function PageHero({ tag, title, subtitle, image, imagePosition, anchors, children }: PageHeroProps) {
  const crumb = (
    <nav aria-label="Fil d’Ariane" className="text-[14px] text-warm-grey">
      <Link href="/" className="hover:text-ink transition-colors">Accueil</Link>
      <span aria-hidden="true" className="mx-2">/</span>
      <span className="text-ink">{tag}</span>
    </nav>
  );

  const extras = (
    <>
      {anchors && anchors.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2">
          {anchors.map((a) => (
            <li key={a.href}>
              <a href={a.href} className="text-[15px] text-ink underline decoration-ink/25 underline-offset-[6px] hover:decoration-ink transition-colors">
                {a.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      {children && <div className="mt-9 flex flex-wrap items-center gap-3">{children}</div>}
    </>
  );

  if (image) {
    return (
      <section className="shell pt-8 pb-16 lg:pt-12 lg:pb-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:items-end">
          <div className="lg:pb-6">
            {crumb}
            <AnimateIn variant="fade-up" duration={1}>
              <h1 className="display-lg mt-10 lg:mt-16 text-ink">{title}</h1>
            </AnimateIn>
            <AnimateIn variant="fade-up" delay={150}>
              <p className="lead mt-7 max-w-[54ch] whitespace-pre-line">{subtitle}</p>
              {extras}
            </AnimateIn>
          </div>
          <RevealImage
            src={image}
            alt=""
            priority
            position={imagePosition}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="aspect-[4/3] lg:aspect-[5/6] w-full"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="shell pt-8 pb-16 lg:pt-12 lg:pb-24">
      {crumb}
      <div className="mt-10 lg:mt-16 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16 lg:items-end">
        <AnimateIn variant="fade-up" duration={1}>
          <h1 className="display-lg max-w-[18ch] text-ink">{title}</h1>
        </AnimateIn>
        <AnimateIn variant="fade-up" delay={150} className="lg:pb-2">
          <p className="lead max-w-[54ch] whitespace-pre-line">{subtitle}</p>
          {extras}
        </AnimateIn>
      </div>
    </section>
  );
}
