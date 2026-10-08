"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";

/**
 * Questions fréquentes : titre et sortie vers le contact à gauche, collants ;
 * l'accordéon occupe la colonne de droite.
 */
export function FaqSplit({
  title = "Vos questions, nos réponses",
  items,
}: {
  title?: string;
  items: { q: string; a: string }[];
}) {
  const uid = useId();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-20">
      <div className="lg:sticky lg:top-32 lg:self-start">
        <h2 className="display-lg text-ink">{title}</h2>
        <p className="mt-6 max-w-[34ch] text-[17px] leading-relaxed text-charcoal">
          Une autre question ? Écrivez-nous, nous vous répondons personnellement.
        </p>
        <Link href="/contact" className="link-arrow mt-6">
          Nous écrire <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <ul className="border-t border-ink/10">
        {items.map((f, i) => {
          const expanded = open === i;
          return (
            <li key={f.q} className="border-b border-ink/10">
              <h3 className="font-sans tracking-normal">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`${uid}-${i}`}
                  onClick={() => setOpen(expanded ? null : i)}
                  className="w-full flex items-center justify-between gap-6 py-6 text-left"
                >
                  <span className="text-[19px] font-medium leading-snug text-ink">{f.q}</span>
                  <span
                    aria-hidden="true"
                    className={`grid place-items-center size-9 shrink-0 rounded-full border transition-all duration-300 ${
                      expanded ? "rotate-45 bg-ink border-ink text-white" : "border-ink/20 text-ink"
                    }`}
                  >
                    <Plus className="size-4" />
                  </span>
                </button>
              </h3>
              <div
                id={`${uid}-${i}`}
                className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="max-w-[62ch] pb-7 text-[16px] leading-relaxed text-charcoal">{f.a}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
