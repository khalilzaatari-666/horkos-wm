"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Carrousel horizontal en défilement natif (scroll-snap), avec flèches rondes
 * et compteur. Au doigt, il défile simplement ; au clavier, les flèches sont
 * de vrais boutons.
 */
export function Rail({
  children,
  label,
  header,
  itemClassName = "w-[82%] sm:w-[46%] lg:w-[calc((100%-48px)/3)]",
  tone = "light",
}: {
  children: ReactNode;
  /** Nom accessible de la liste. */
  label: string;
  /** Titre et texte posés à gauche des flèches. */
  header?: ReactNode;
  itemClassName?: string;
  tone?: "light" | "dark";
}) {
  const ref = useRef<HTMLUListElement>(null);
  const items = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 24 : el.clientWidth;
    setIndex(Math.round(el.scrollLeft / step));
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * ((first?.offsetWidth ?? 300) + 24), behavior: "smooth" });
  };

  const arrow =
    tone === "dark"
      ? "ring-cream/25 text-cream hover:bg-cream hover:text-ink disabled:opacity-30"
      : "ring-ink/15 text-ink hover:bg-ink hover:text-white disabled:opacity-30";

  return (
    <div>
      <div className="flex items-end justify-between gap-8 mb-10">
        <div className="min-w-0">{header}</div>
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <span className={`text-[14px] tabular-nums ${tone === "dark" ? "text-cream-muted" : "text-warm-grey"}`}>
            {String(Math.min(index + 1, items.length)).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Précédent"
            className={`grid place-items-center size-12 rounded-full ring-1 transition-colors ${arrow}`}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={atEnd}
            aria-label="Suivant"
            className={`grid place-items-center size-12 rounded-full ring-1 transition-colors ${arrow}`}
          >
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <ul
        ref={ref}
        onScroll={sync}
        aria-label={label}
        className="no-scrollbar flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-5 px-5 md:mx-0 md:px-0"
      >
        {items.map((child, i) => (
          <li key={i} className={`snap-start shrink-0 ${itemClassName}`}>
            {child}
          </li>
        ))}
      </ul>
    </div>
  );
}
