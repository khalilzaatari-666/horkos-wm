"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

/** L'instance en cours, pour les ancres de page (`AnchorJump`). */
export let lenis: Lenis | null = null;

/**
 * Défilement amorti à la molette, sur le site public uniquement.
 *
 * Le défilement reste natif (Lenis ne fait qu'interpoler la position), donc
 * `position: sticky`, l'épinglage et les ancres continuent de fonctionner ;
 * le tactile n'est pas touché. Lenis tourne sur le ticker de GSAP pour que
 * les animations liées au scroll lisent la même position à la même image.
 */
export function SmoothScroll() {
  const pathname = usePathname();

  // Un défilement amorti encore en cours ne doit pas se poursuivre sur la page
  // suivante : on repart de la position où Next vient de la placer.
  useEffect(() => {
    lenis?.stop();
    lenis?.start();
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const instance = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    lenis = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      instance.destroy();
      lenis = null;
    };
  }, []);

  return null;
}
