"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface DrawLineProps {
  className?: string;
  delay?: number;
  direction?: "left" | "center";
}

export function DrawLine({ className = "", delay = 0, direction = "left" }: DrawLineProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.style.transform = "scaleX(1)";
      return;
    }

    gsap.fromTo(
      el,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 0.8,
        delay: delay / 1000,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [delay, direction]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transformOrigin: direction === "center" ? "center" : "left",
        transform: "scaleX(0)",
      }}
    />
  );
}
