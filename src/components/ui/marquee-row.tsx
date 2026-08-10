"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

gsap.registerPlugin(Observer, ScrollTrigger);

interface MarqueeRowProps {
  items: React.ReactNode[];
  /** Travel direction of the cards. */
  direction?: "left" | "right";
  /** Pixels per second. Low and steady reads as premium; fast reads as an ad. */
  speed?: number;
  /** Width of one card, as Tailwind classes. */
  cardWidth?: string;
  className?: string;
}

const GAP_PX = 14;

/**
 * Seamless infinite row.
 *
 * The track holds N identical copies of `items`. One copy plus one gap is the
 * stride: translating by exactly that distance lands the row back on an
 * identical frame, so `repeat: -1` loops with no seam. Everything else —
 * hover, drag, offscreen pausing — drives the tween's `progress()` rather than
 * `x`, which keeps the wrap arithmetic exact no matter how far it is nudged.
 */
export function MarqueeRow({
  items,
  direction = "left",
  speed = 34,
  cardWidth = "w-[248px] sm:w-[272px]",
  className = "",
}: MarqueeRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(2);
  const reduced = usePrefersReducedMotion();

  // Enough copies that the track always overflows the viewport by a full stride,
  // otherwise the loop reset would expose empty space on wide screens.
  useEffect(() => {
    if (reduced) return;
    const container = containerRef.current;
    const copy = copyRef.current;
    if (!container || !copy) return;

    const measure = () => {
      const stride = copy.getBoundingClientRect().width + GAP_PX;
      if (!stride) return;
      const needed = Math.max(2, Math.ceil(container.getBoundingClientRect().width / stride) + 1);
      setCopies((current) => (current === needed ? current : needed));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(copy);
    return () => ro.disconnect();
  }, [reduced, items.length]);

  useEffect(() => {
    if (reduced) return;
    const container = containerRef.current;
    const track = trackRef.current;
    const copy = copyRef.current;
    if (!container || !track || !copy) return;

    const ctx = gsap.context(() => {
      const stride = copy.getBoundingClientRect().width + GAP_PX;
      if (!stride) return;

      const from = direction === "left" ? 0 : -stride;
      const to = direction === "left" ? -stride : 0;

      gsap.set(track, { x: from });
      const loop = gsap.to(track, {
        x: to,
        duration: stride / speed,
        ease: "none",
        repeat: -1,
      });

      // Hover eases the row to a stop instead of cutting it, and back up again.
      const slowTo = (timeScale: number) =>
        gsap.to(loop, { timeScale, duration: 0.45, ease: "power2.out", overwrite: true });

      const canHover = window.matchMedia("(hover: hover)").matches;
      const onEnter = () => slowTo(0);
      const onLeave = () => slowTo(1);
      if (canHover) {
        container.addEventListener("mouseenter", onEnter);
        container.addEventListener("mouseleave", onLeave);
      }

      // Don't burn frames on a row nobody is looking at.
      const trigger = ScrollTrigger.create({
        trigger: container,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
      });

      // Push the row by hand. Nudging `progress` keeps it inside the loop.
      const wrapProgress = gsap.utils.wrap(0, 1);
      const dragSign = direction === "left" ? -1 : 1;
      const observer = Observer.create({
        target: container,
        type: "touch,pointer",
        dragMinimum: 4,
        onPress: () => slowTo(0),
        onRelease: () => slowTo(1),
        onDrag: (self) => {
          loop.progress(wrapProgress(loop.progress() + (dragSign * self.deltaX) / stride));
        },
      });

      return () => {
        container.removeEventListener("mouseenter", onEnter);
        container.removeEventListener("mouseleave", onLeave);
        trigger.kill();
        observer.kill();
      };
    }, container);

    return () => ctx.revert();
  }, [copies, direction, speed, reduced, items.length]);

  const renderCopy = (copyIndex: number) => (
    <div
      key={copyIndex}
      ref={copyIndex === 0 ? copyRef : undefined}
      className="flex shrink-0"
      style={{ gap: GAP_PX }}
      aria-hidden={copyIndex > 0}
    >
      {items.map((item, i) => (
        <div key={i} className={`shrink-0 ${cardWidth}`}>
          {item}
        </div>
      ))}
    </div>
  );

  // No motion means no duplicates either — a plain scrollable row, swipeable.
  if (reduced) {
    return (
      <div
        className={`flex overflow-x-auto px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
        style={{ gap: GAP_PX }}
      >
        {items.map((item, i) => (
          <div key={i} className={`shrink-0 ${cardWidth}`}>
            {item}
          </div>
        ))}
      </div>
    );
  }

  // Full-bleed by design: the row is rendered outside the page container so it
  // spans the viewport, and the mask fades both ends instead of cutting them.
  return (
    <div
      ref={containerRef}
      className={`overflow-hidden py-3 cursor-grab active:cursor-grabbing ${className}`}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
      }}
    >
      <div ref={trackRef} className="flex w-max" style={{ gap: GAP_PX }}>
        {Array.from({ length: copies }, (_, i) => renderCopy(i))}
      </div>
    </div>
  );
}
