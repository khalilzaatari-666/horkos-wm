"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Un grand énoncé qui s'éclaire mot à mot au fil du défilement.
 *
 * Le texte est rendu pleinement lisible : c'est le script qui l'atténue avant
 * de le révéler, jamais l'inverse. Sans JavaScript, ou en mouvement réduit,
 * il reste tel quel.
 */
export function TextReveal({
  text,
  className = "",
  as: Tag = "p",
}: {
  text: string;
  className?: string;
  as?: "p" | "h2" | "blockquote";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el.querySelectorAll("[data-word]"),
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 48%", scrub: 0.6 },
        },
      );
    });
    return () => mm.revert();
  }, []);

  const words = text.split(" ");
  return (
    <Tag ref={ref as never} className={className}>
      {words.map((w, i) => (
        <span key={i} data-word>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}
