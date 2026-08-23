"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface SwipeRowProps {
  items: ReactNode[];
  className?: string;
  /** Flex basis per card - tune so the next card peeks in and invites the swipe. */
  cardBasis?: string;
}

/**
 * Mobile browser for a set of cards: one snapping horizontal row with a scroll
 * thumb underneath. Avoids the orphan rows a 2-up grid leaves behind, and keeps
 * long lists from becoming an endless vertical scroll.
 *
 * Callers inside a padded container should pass `-mx-7` so the row can bleed to
 * the screen edges while its own `px-7` preserves the gutter.
 */
export function SwipeRow({ items, className = "", cardBasis = "78%" }: SwipeRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const isSingle = items.length <= 1;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Drifting in from the right doubles as a hint that the row swipes.
      gsap.fromTo(
        gsap.utils.toArray<HTMLElement>("[data-swipe-card]", scroller),
        { opacity: 0, x: 40 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: { trigger: scroller, start: "top 92%", toggleActions: "play none none none" },
        }
      );
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(gsap.utils.toArray("[data-swipe-card]", scroller), { opacity: 1 });
    });

    return () => mm.revert();
  }, []);

  /**
   * Tapping a card that is only partly on screen pulls it into view rather than
   * acting on a card the user can't fully see. Scrolls the scroller directly
   * instead of `scrollIntoView`, which would also scroll ancestors vertically.
   * Snap-mandatory settles the final resting position afterwards.
   */
  const revealCard = (card: HTMLElement) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    // 1px tolerance absorbs sub-pixel layout rounding.
    const fullyVisible =
      cardRect.left >= scrollerRect.left - 1 && cardRect.right <= scrollerRect.right + 1;
    if (fullyVisible) return;

    const centred =
      cardRect.left - scrollerRect.left - (scroller.clientWidth - cardRect.width) / 2;

    scroller.scrollTo({
      left: scroller.scrollLeft + centred,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  // Scroll thumb. No motion-preference guard - it is a navigation affordance,
  // not decoration, so hiding it would cost reduced-motion users information.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const bar = progressRef.current;
    if (!scroller || !bar) return;

    const setX = gsap.quickSetter(bar, "x", "%");
    const setScaleX = gsap.quickSetter(bar, "scaleX");

    let frame = 0;
    const update = () => {
      frame = 0;
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      if (scrollWidth <= 0) return;
      setScaleX(Math.min(1, clientWidth / scrollWidth));
      setX((scrollLeft / scrollWidth) * 100);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(scroller);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={className}>
      <div
        ref={scrollerRef}
        className="flex items-start gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-7 px-7 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div
            key={i}
            data-swipe-card
            onClick={(e) => revealCard(e.currentTarget)}
            className="snap-start shrink-0"
            // A lone card has nothing to swipe to, so let it fill the width.
            style={{ flexBasis: isSingle ? "100%" : cardBasis, opacity: 0 }}
          >
            {item}
          </div>
        ))}
      </div>

      {!isSingle && (
        <div className="px-7 mt-4">
          <div className="h-[3px] rounded-full bg-cream-deep overflow-hidden">
            <div
              ref={progressRef}
              className="h-full w-full rounded-full bg-bronze origin-left"
              style={{ transform: "scaleX(0.4)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
