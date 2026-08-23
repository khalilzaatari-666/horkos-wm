"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

interface SplitHeadingProps {
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  delay?: number;
  splitBy?: "words" | "chars";
}

export function SplitHeading({
  text,
  as: Tag = "h1",
  className = "",
  delay = 0,
  splitBy = "words",
}: SplitHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // The element renders at opacity 0 so the words never flash before the
    // split runs - reveal the container itself as soon as we take over.
    const reveal = () => gsap.set(el, { opacity: 1 });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      return;
    }

    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    const split = SplitText.create(el, {
      // `mask` must be one of the types being generated, so lines are always split.
      type: splitBy === "chars" ? "lines,words,chars" : "lines,words",
      mask: "lines",
      // Re-splits on font load and resize, re-running onSplit each time.
      autoSplit: true,
      onSplit: (self) => {
        reveal();
        return gsap.fromTo(
          splitBy === "chars" ? self.chars : self.words,
          { y: "100%", opacity: 0 },
          {
            y: "0%",
            opacity: 1,
            duration: isMobile ? 0.55 : 0.7,
            stagger: splitBy === "chars" ? 0.02 : isMobile ? 0.03 : 0.04,
            ease: "power3.out",
            delay: delay / 1000,
            scrollTrigger: {
              trigger: el,
              start: isMobile ? "top 92%" : "top 88%",
              toggleActions: "play none none none",
            },
          }
        );
      },
    });

    return () => {
      split.revert();
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [text, delay, splitBy]);

  return (
    <Tag ref={ref} className={className} style={{ opacity: 0 }}>
      {text}
    </Tag>
  );
}
