"use client";

import { useEffect, useState } from "react";

/**
 * Sommaire collant des pages longues : la section lue est surlignée, une barre
 * mesure la progression de lecture.
 */
export function TocRail({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((s) => io.observe(s));

    const onScroll = () => {
      const first = sections[0];
      const last = sections[sections.length - 1];
      if (!first || !last) return;
      const start = first.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
      const end = last.getBoundingClientRect().bottom + window.scrollY - window.innerHeight * 0.7;
      setProgress(Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [items]);

  return (
    <nav aria-label="Sur cette page" className="hidden lg:block sticky top-32 self-start">
      <p className="text-[13px] text-warm-grey">Sur cette page</p>
      <span className="mt-4 block h-px bg-ink/10">
        <span className="block h-px origin-left bg-ink transition-transform duration-200" style={{ transform: `scaleX(${progress})` }} />
      </span>
      <ul className="mt-5 space-y-1">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "location" : undefined}
              className={`block py-1.5 text-[15px] leading-snug transition-colors ${
                active === i.id ? "text-ink" : "text-warm-grey hover:text-ink"
              }`}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
