import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface StackFeature {
  title: string;
  desc: string;
  href: string;
  linkLabel: string;
  image: string;
  /** Lignes de détail facultatives (libellé, valeur), sous le texte. */
  facts?: [string, string][];
}

/**
 * Grandes cartes photographiques qui s'empilent au défilement : chacune reste
 * collée sous l'en-tête pendant que la suivante monte la recouvrir. Le texte
 * se pose sur la partie sombre de la photographie, à gauche.
 */
export function StackFeatures({ items }: { items: StackFeature[] }) {
  return (
    <div className="relative">
      {items.map((it, i) => (
        <article
          key={it.title}
          className="sticky mb-6 last:mb-0"
          style={{ top: `calc(96px + ${i * 22}px)` }}
        >
          <div className="relative h-[min(560px,72vh)] min-h-[440px] overflow-hidden rounded-[20px] bg-ink text-cream shadow-[0_-12px_40px_-24px_rgba(11,26,46,0.5)]">
            <Image
              src={it.image}
              alt=""
              fill
              sizes="(min-width: 1320px) 1240px, 100vw"
              className="object-cover object-right"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-ink/0 max-md:bg-gradient-to-t max-md:from-ink/90 max-md:via-ink/55"
            />
            <div className="relative flex h-full max-w-[520px] flex-col justify-end p-7 sm:p-10 lg:p-14">
              <h3 className="display-md text-cream">{it.title}</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-cream-muted">{it.desc}</p>
              {it.facts && (
                <dl className="mt-6 divide-y divide-cream/15 border-y border-cream/15 text-[15px]">
                  {it.facts.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-6 py-2.5">
                      <dt className="text-cream-muted">{k}</dt>
                      <dd className="text-cream">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <Link href={it.href} className="btn btn-light btn-sm mt-8 self-start">
                {it.linkLabel} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
