"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

/**
 * Titre d'ouverture qui monte ligne à ligne derrière un masque, comme une
 * composition qu'on dévoile. Le découpage suit la mise en page réelle (police
 * chargée, largeur d'écran) et se refait au redimensionnement. En mouvement
 * réduit, le titre s'affiche tel quel.
 */
export function LineReveal({
  as: Tag = "h1",
  className = "",
  delay = 0,
  children,
}: {
  as?: "h1" | "h2" | "p";
  className?: string;
  /** En millisecondes. */
  delay?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add({ reduce: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
      if (ctx.conditions?.reduce) {
        gsap.set(el, { autoAlpha: 1 });
        return;
      }
      let anim: gsap.core.Tween | undefined;
      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit(self) {
          gsap.set(el, { autoAlpha: 1 });
          // Interlignage serré : le masque déborde d'un rien en haut et en bas
          // pour ne rogner ni les jambages (p, q) ni les capitales accentuées.
          gsap.set(self.masks, { padding: "0.12em 0", margin: "-0.12em 0" });
          anim = gsap.from(self.lines, {
            yPercent: 125,
            duration: 1.15,
            ease: "expo.out",
            stagger: 0.09,
            delay: delay / 1000,
          });
          return anim;
        },
      });
      // Même filet que `AnimateIn` : un titre ne reste jamais masqué si le
      // rendu a été ralenti (onglet en arrière-plan au chargement).
      const failsafe = window.setTimeout(() => {
        anim?.progress(1);
        gsap.set(el, { autoAlpha: 1 });
      }, delay + 2600);
      return () => {
        window.clearTimeout(failsafe);
        split.revert();
      };
    });
    return () => mm.revert();
  }, [delay]);

  return (
    <Tag ref={ref} className={className} style={{ visibility: "hidden" }}>
      {children}
    </Tag>
  );
}
