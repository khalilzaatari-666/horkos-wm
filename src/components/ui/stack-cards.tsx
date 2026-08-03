"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface StackCardsProps {
  items: ReactNode[];
  className?: string;
  /** Distance from the viewport top where the first card parks (clears the header). */
  topOffset?: number;
  /** Extra offset per card, so each parked card leaves a visible sliver. */
  step?: number;
  /** Vertical flow gap — this is what creates the scroll distance between cards. */
  gap?: number;
}

/**
 * Mobile card deck: each card parks under the header and the next one scrolls
 * over it, while the covered card recedes slightly for depth. Meant to be
 * rendered inside a `md:hidden` wrapper — desktop keeps its grid.
 *
 * NOTE: `position: sticky` breaks if any ancestor is a scroll container, so
 * sections wrapping this must use `overflow-x-clip` rather than `overflow-hidden`.
 */
export function StackCards({
  items,
  className = "",
  topOffset = 96,
  step = 12,
  gap = 20,
}: StackCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mm = gsap.matchMedia();

    mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-stack-card]", container);

      cards.forEach((card, i) => {
        const inner = card.firstElementChild as HTMLElement | null;
        if (!inner) return;

        // A sticky element's getBoundingClientRect reports its *pinned* position,
        // so it can never be its own ScrollTrigger trigger — the measurement is
        // wrong the moment it parks. Trigger off the container instead and derive
        // offsets from offsetTop, which reports layout position and ignores sticky.
        gsap.fromTo(
          inner,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power3.out",
            scrollTrigger: {
              trigger: container,
              start: () => `top+=${card.offsetTop - window.innerHeight * 0.9} top`,
              toggleActions: "play none none none",
              invalidateOnRefresh: true,
            },
          }
        );

        const next = cards[i + 1];
        if (!next) return;

        // Recede while the next card travels from the viewport bottom to its park.
        gsap.to(inner, {
          scale: 0.93,
          ease: "none",
          scrollTrigger: {
            trigger: container,
            start: () => `top+=${next.offsetTop - window.innerHeight} top`,
            end: () => `top+=${next.offsetTop - (topOffset + i * step)} top`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      });
    });

    // Reduced motion still needs the cards visible — they render at opacity 0.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(gsap.utils.toArray("[data-stack-inner]", container), { opacity: 1 });
    });

    // Above the breakpoint the deck is display:none, but the inline opacity would
    // persist if the user resizes up, so clear it there too.
    mm.add("(min-width: 768px)", () => {
      gsap.set(gsap.utils.toArray("[data-stack-inner]", container), { opacity: 1 });
    });

    return () => mm.revert();
  }, [topOffset, step]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {items.map((item, i) => (
        <div
          key={i}
          data-stack-card
          className="sticky"
          style={{
            top: topOffset + i * step,
            marginBottom: i === items.length - 1 ? 0 : gap,
          }}
        >
          <div data-stack-inner style={{ transformOrigin: "50% 0%", opacity: 0 }}>
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}
