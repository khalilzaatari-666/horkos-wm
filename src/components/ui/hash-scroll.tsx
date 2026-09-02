"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

/** Repli quand le type de navigation est indisponible : en deçà, on considère
 *  que le navigateur a déjà fait le saut vers l'ancre. */
const ALREADY_THERE_PX = 120;

/**
 * Le document a-t-il été chargé directement sur cette URL ?
 *
 * L'entrée de navigation garde l'URL du chargement initial : après un passage
 * interne, elle désigne encore la page de départ. `null` quand la mesure n'est
 * pas disponible, pour laisser l'appelant retomber sur la position.
 */
/**
 * Le document n'est neuf qu'une fois. Passé le premier montage, on sait qu'on
 * arrive d'une autre page sans avoir à le déduire de l'URL : c'est ce qui
 * distingue un rechargement d'un aller-retour depuis l'accueil, où l'URL de
 * chargement initial désigne déjà cette page.
 */
let firstMount = true;

/**
 * L'ancre demandée, c'est-à-dire le dernier segment du hash.
 *
 * Au deuxième passage sur une même page, le routeur empile les ancres plutôt
 * que de les remplacer : revenir de l'accueil sur la page produits donne
 * `#entreprises#individuelles`. Comparer le hash entier laisserait alors la
 * section demandée sans réponse, et la page resterait tout en haut.
 */
function requestedAnchor(): string {
  const segments = window.location.hash.split("#").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

function isDirectLoad(): boolean | null {
  const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (!nav) return null;

  try {
    return new URL(nav.name).pathname === window.location.pathname;
  } catch {
    return null;
  }
}

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
 * ne ferait que provoquer un clignotement, donc on se contente d'ajuster la
 * position à `offset` près.
 */
export function HashScroll({ id, offset = 0, delay = 200, duration = 1.1 }: HashScrollProps) {
  useLayoutEffect(() => {
    if (requestedAnchor() !== id) return;

    const target = document.getElementById(id);
    if (!target) return;

    // Sans cela, la pile d'ancres s'allonge d'un cran à chaque aller-retour et
    // finit par remplir la barre d'adresse.
    if (window.location.hash !== `#${id}`) {
      window.history.replaceState(null, "", `${window.location.pathname}#${id}`);
    }

    // Seul le montage qui suit le chargement du document peut être direct ;
    // les suivants viennent forcément d'une navigation interne. Les autres
    // instances de la page ont déjà rendu la main plus haut, sur le hash : le
    // drapeau n'est consommé que par celle dont l'ancre est visée.
    const fresh = firstMount;
    firstMount = false;

    const settle = () =>
      window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - offset);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      settle();
      return;
    }

    // Chargement direct : le navigateur a déjà sauté à l'ancre, il ne reste
    // qu'à dégager la hauteur de l'en-tête. Remonter pour redescendre ne
    // ferait que provoquer un clignotement.
    const direct = fresh ? isDirectLoad() : false;
    const alreadyThere =
      direct === null && Math.abs(target.getBoundingClientRect().top) < ALREADY_THERE_PX;

    if (direct === true || alreadyThere) {
      settle();
      // Le saut natif vers l'ancre peut tomber après l'hydratation et écraser
      // la correction : on repasse une fois la mise en page stabilisée, sinon
      // l'en-tête collant recouvre l'intitulé de la section.
      const frame = requestAnimationFrame(settle);
      const timer = window.setTimeout(settle, delay);
      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(timer);
      };
    }

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
