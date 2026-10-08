"use client";

import { useEffect } from "react";
import { lenis } from "./smooth-scroll";

/** Au-delà de cette distance (en hauteurs d'écran), on ne fait plus défiler. */
const FAR = 1.5;
const FADE_MS = 180;

/**
 * Les ancres de page (`#philosophie`…) défilent en douceur via le CSS. Quand la
 * cible est loin, ce défilement traverserait des sections animées au scroll -
 * la rangée d'étapes épinglée défilerait sous les yeux. Dans ce cas, la page
 * s'estompe, saute directement à la section, puis réapparaît.
 */
export function AnchorJump() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      const id = link?.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(decodeURIComponent(id)) : null;
      if (!target) return;
      // Lenis neutralise le défilement doux du CSS : c'est lui qui fait le trajet,
      // en respectant le `scroll-margin` de la section.
      const offset = -parseFloat(getComputedStyle(target).scrollMarginTop || "0");
      if (Math.abs(target.getBoundingClientRect().top) < window.innerHeight * FAR) {
        if (!lenis) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset, duration: 1.2 });
        history.pushState(null, "", `#${id}`);
        return;
      }

      e.preventDefault();
      const main = document.querySelector("main");
      if (!main) return;
      main.style.transition = `opacity ${FADE_MS}ms ease`;
      main.style.opacity = "0";
      window.setTimeout(() => {
        if (lenis) lenis.scrollTo(target, { offset, immediate: true });
        else target.scrollIntoView({ behavior: "instant", block: "start" });
        history.pushState(null, "", `#${id}`);
        main.style.opacity = "";
        window.setTimeout(() => (main.style.transition = ""), FADE_MS);
      }, FADE_MS);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
