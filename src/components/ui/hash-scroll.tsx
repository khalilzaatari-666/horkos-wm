"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

/** En deçà, on considère que le navigateur a déjà fait le saut vers l'ancre. */
const ALREADY_THERE_PX = 120;

interface HashScrollProps {
  /** `id` de la section visée, sans le `#`. */
  id: string;
  /**
   * Distance entre le haut de la fenêtre et le haut de la section à l'arrivée.
   * À zéro, la section occupe l'écran seule : toute marge laisserait apparaître
   * une bande de la section précédente, visible au travers de l'en-tête
   * translucide.
   */
  offset?: number;
  /** Temps laissé à la mise en page pour se stabiliser avant de mesurer. */
  delay?: number;
  duration?: number;
}

/**
 * Descend en douceur jusqu'à une section quand on arrive sur la page avec son
 * ancre - depuis la carte « Céder un actif » du carrousel, par exemple.
 *
 * Le lien porte `scroll={false}` : Next ne saute donc pas à l'ancre et laisse
 * l'animation faire le trajet. Sur un chargement direct de l'URL en revanche,
 * le navigateur a déjà sauté avant l'hydratation ; remonter pour redescendre
 * ne ferait que provoquer un clignotement, donc on ne touche à rien.
 */
export function HashScroll({ id, offset = 0, delay = 200, duration = 1.1 }: HashScrollProps) {
  useLayoutEffect(() => {
    if (window.location.hash !== `#${id}`) return;

    const target = document.getElementById(id);
    if (!target) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      target.scrollIntoView();
      return;
    }

    // Le navigateur y est déjà : c'est un chargement direct, on lui laisse.
    if (Math.abs(target.getBoundingClientRect().top) < ALREADY_THERE_PX) return;

    // Repartir du haut, sinon la descente commencerait à la position héritée de
    // la page précédente, que `scroll={false}` a conservée.
    window.scrollTo(0, 0);

    const tween = gsap.to(window, {
      scrollTo: { y: target, offsetY: offset, autoKill: true },
      duration,
      delay: delay / 1000,
      ease: "power2.inOut",
    });

    return () => {
      tween.kill();
    };
  }, [id, offset, delay, duration]);

  return null;
}
