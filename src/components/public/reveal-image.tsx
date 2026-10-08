"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Photographie qui s'ouvre à l'entrée dans l'écran : le cadre se déploie
 * depuis un rectangle resserré pendant que l'image se pose. Une fois, et pas
 * en mouvement réduit.
 */
export function RevealImage({
  src,
  alt,
  sizes,
  priority = false,
  position,
  className = "",
  imageClassName = "",
  children,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  position?: string;
  className?: string;
  imageClassName?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const inView = el.getBoundingClientRect().top < window.innerHeight * 0.9;
      const st = inView ? undefined : { trigger: el, start: "top 85%", toggleActions: "play none none none" };
      const frame = gsap.fromTo(
        el,
        { clipPath: "inset(10% 8% 10% 8% round 20px)" },
        { clipPath: "inset(0% 0% 0% 0% round 20px)", duration: 1.4, ease: "expo.out", scrollTrigger: st },
      );
      const img = gsap.fromTo(
        el.querySelector("img"),
        { scale: 1.18 },
        { scale: 1, duration: 1.8, ease: "expo.out", scrollTrigger: st },
      );
      // Même filet de sécurité qu'`AnimateIn` : une image déjà à l'écran ne
      // doit jamais rester rognée si le rendu a été ralenti (onglet en
      // arrière-plan au chargement).
      if (inView) {
        const id = window.setTimeout(() => {
          frame.progress(1);
          img.progress(1);
        }, 2400);
        return () => window.clearTimeout(id);
      }
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={ref} className={`reveal-frame relative overflow-hidden rounded-[20px] bg-cream-deep ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectPosition: position }}
        className={`object-cover ${imageClassName}`}
      />
      {children}
    </div>
  );
}
