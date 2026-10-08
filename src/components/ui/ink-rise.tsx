"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Section encre dont le fond monte du blanc à l'encre en entrant à l'écran,
 * au lieu d'arriver comme un bloc. Utile après une section épinglée, sous
 * laquelle elle apparaît pendant que l'épinglage se termine. Sans animation
 * (mouvement réduit), c'est une section `bg-ink` ordinaire.
 */
export function InkRise({ className = "", ...props }: React.ComponentProps<"section">) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el,
        { backgroundColor: "#ffffff" },
        {
          backgroundColor: "#0b1a2e",
          ease: "none",
          // Mesurée après les épinglages de la page, qui la décalent.
          // Montée étalée sur presque tout l'écran, `scrub` amorti pour lisser.
          scrollTrigger: { trigger: el, start: "top bottom", end: "top 10%", scrub: 1.2, refreshPriority: -1 },
        },
      );
    });
    return () => mm.revert();
  }, []);

  return <section ref={ref} className={`bg-ink ${className}`} {...props} />;
}
