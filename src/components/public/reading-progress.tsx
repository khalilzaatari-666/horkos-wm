"use client";

import { useEffect, useRef } from "react";

/** Fine barre de lecture collée sous l'en-tête, pour les articles. */
export function ReadingProgress({ target }: { target: string }) {
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [target]);

  return (
    <span aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-[3px]">
      <span ref={bar} className="block h-full origin-left scale-x-0 bg-ink" />
    </span>
  );
}
