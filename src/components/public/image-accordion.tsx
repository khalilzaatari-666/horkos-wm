"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";

export interface AccordionItem {
  title: string;
  desc: string;
  image?: string;
  href?: string;
  linkLabel?: string;
}

export interface AccordionTab {
  label: string;
  items: AccordionItem[];
}

/**
 * Liste de grands intitulés à gauche, image collante à droite qui change avec
 * l'entrée ouverte. Sur mobile, l'image passe dans le panneau ouvert.
 *
 * `fit="contain"` pour les illustrations détourées (posées sur un panneau
 * crème profonde), `cover` pour les photographies.
 */
export function ImageAccordion({
  tabs,
  fit = "cover",
}: {
  tabs: AccordionTab[];
  fit?: "cover" | "contain";
}) {
  const uid = useId();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(0);
  const items = tabs[tab].items;
  const current = items[open] ?? items[0];

  const imageClass =
    fit === "contain"
      ? "object-contain p-[12%]"
      : "object-cover";

  return (
    <div>
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Public" className="inline-flex rounded-[8px] bg-cream-deep/70 p-1 mb-10">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              role="tab"
              type="button"
              aria-selected={tab === i}
              onClick={() => {
                setTab(i);
                setOpen(0);
              }}
              className={`h-10 px-5 rounded-[6px] text-[15px] transition-colors duration-300 ${
                tab === i ? "bg-white text-ink shadow-[0_2px_8px_rgba(11,26,46,0.08)]" : "text-charcoal hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-20">
        <ul className="border-t border-ink/10">
          {items.map((item, i) => {
            const expanded = open === i;
            const panelId = `${uid}-${tab}-${i}`;
            return (
              <li key={item.title} className="border-b border-ink/10">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(i)}
                  onMouseEnter={() => setOpen(i)}
                  className="group w-full flex items-center justify-between gap-6 py-5 text-left"
                >
                  <span
                    className={`font-heading font-light text-[clamp(1.2rem,1.7vw,1.55rem)] leading-[1.1] tracking-[-0.02em] transition-colors duration-300 ${
                      expanded ? "text-ink" : "text-ink/60 group-hover:text-ink/85"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`grid place-items-center size-9 shrink-0 rounded-full border transition-all duration-300 ${
                      expanded ? "rotate-45 bg-ink border-ink text-white" : "border-ink/20 text-ink"
                    }`}
                  >
                    <Plus className="size-4" />
                  </span>
                </button>
                <div
                  id={panelId}
                  className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    {item.image && (
                      <div className="lg:hidden relative aspect-[16/10] rounded-2xl overflow-hidden bg-cream-deep mb-5">
                        <Image src={item.image} alt="" fill sizes="100vw" unoptimized={item.image.endsWith(".svg")} className={imageClass} />
                      </div>
                    )}
                    <p className="max-w-[52ch] pb-2 text-[17px] leading-relaxed text-charcoal">{item.desc}</p>
                    {item.href && (
                      <Link href={item.href} className="link-arrow mt-3 mb-7">
                        {item.linkLabel ?? "En savoir plus"} <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    )}
                    {!item.href && <div className="h-5" />}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden lg:block">
          <div className="sticky top-28 relative aspect-[4/5] rounded-[20px] overflow-hidden bg-cream-deep">
            {tabs.flatMap((t, ti) =>
              t.items.map((item, ii) =>
                item.image ? (
                  <Image
                    key={`${ti}-${ii}`}
                    src={item.image}
                    alt=""
                    fill
                    sizes="40vw"
                    unoptimized={item.image.endsWith(".svg")}
                    className={`${imageClass} transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      ti === tab && item === current ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]"
                    }`}
                  />
                ) : null,
              ),
            )}
            {fit === "contain" && (
              <p className="absolute left-6 bottom-6 right-6 font-heading text-[22px] leading-tight text-ink">
                {current.title}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
