import gsap from "gsap";

const COULEURS = ["#A9784F", "#0B1A2E", "#EFE7D8", "#C99A6E"];

/**
 * Une gerbe de confettis, lancée depuis un élément de la page : une
 * quarantaine de petits rectangles aux couleurs du cabinet, jetés vers le
 * haut puis retombant, retirés à la fin. Rien en mouvement réduit.
 */
export function lancerConfettis(depuis: HTMLElement, nombre = 44) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const r = depuis.getBoundingClientRect();
  const calque = document.createElement("div");
  calque.setAttribute("aria-hidden", "true");
  Object.assign(calque.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "60", overflow: "hidden" });
  document.body.appendChild(calque);

  const x0 = r.left + r.width / 2;
  const y0 = r.top + Math.min(r.height / 2, 80);
  const tl = gsap.timeline({ onComplete: () => calque.remove() });

  for (let i = 0; i < nombre; i++) {
    const p = document.createElement("span");
    const large = Math.random() > 0.5;
    Object.assign(p.style, {
      position: "absolute",
      left: `${x0}px`,
      top: `${y0}px`,
      width: large ? "9px" : "6px",
      height: large ? "5px" : "10px",
      borderRadius: "1.5px",
      background: COULEURS[i % COULEURS.length],
    });
    calque.appendChild(p);

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const force = 180 + Math.random() * 220;
    const dx = Math.cos(angle) * force;
    const dy = Math.sin(angle) * force;
    tl.to(p, { x: dx, y: dy, rotation: (Math.random() - 0.5) * 540, duration: 0.7, ease: "power3.out" }, 0)
      .to(p, { y: dy + 260 + Math.random() * 160, x: dx * 1.25, opacity: 0, duration: 1.4, ease: "power1.in" }, 0.7);
  }
}
