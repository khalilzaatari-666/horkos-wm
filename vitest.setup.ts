import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom n'implémente pas `matchMedia`. GSAP l'appelle au chargement de
// ScrollTrigger, que `AnimateIn` enregistre au niveau du module : tout composant
// qui touche à la trousse d'interface du back-office l'entraîne, et échouerait
// ici pour une raison qui n'a rien à voir avec ce qu'il teste. Le bouchon rend
// une media query qui ne correspond jamais - les animations restent inertes.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// Chaque test repart d'un DOM propre : sans ça, les composants montés fuient
// d'un test à l'autre et les requêtes `screen` deviennent ambiguës.
afterEach(() => {
  cleanup();
});
