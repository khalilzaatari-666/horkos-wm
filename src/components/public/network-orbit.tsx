"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { METIERS, CERCLES, type Metier } from "@/lib/reseau";

gsap.registerPlugin(ScrollTrigger);

/** Rayons des deux orbites, en % du côté du carré. */
const R_INNER = 25;
const R_OUTER = 43;

function place(list: Metier[], radius: number, startDeg: number) {
  return list.map((m, i) => {
    const a = ((startDeg + (360 / list.length) * i) * Math.PI) / 180;
    // Le nom se pose dans le prolongement du rayon, vers l'extérieur : il ne
    // recouvre jamais l'anneau.
    return { ...m, x: 50 + radius * Math.cos(a), y: 50 + radius * Math.sin(a), ca: Math.cos(a), sa: Math.sin(a) };
  });
}

const NODES = [
  ...place(METIERS.filter((m) => m.cercle === "miseEnOeuvre"), R_INNER, -135),
  ...place(METIERS.filter((m) => m.cercle === "sourcing"), R_OUTER, -90),
];

/**
 * L'orbite du réseau : Horkos au centre, les métiers mobilisés autour, en deux
 * cercles - ceux qui mettent en œuvre, ceux qui apportent des opportunités.
 * Survoler ou parcourir au clavier un métier trace le lien depuis le centre et
 * explique quand il intervient. Sans interaction, l'orbite passe d'elle-même
 * d'un métier à l'autre (sauf mouvement réduit).
 *
 * Posée sur un chapitre encre.
 */
export function NetworkOrbit() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const node = NODES[active];

  // Défilement automatique, suspendu dès que la personne prend la main.
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % NODES.length), 3200);
    return () => window.clearInterval(id);
  }, [paused]);

  // Entrée : les orbites se tracent, puis les métiers apparaissent.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Déclenchée par un IntersectionObserver plutôt qu'un ScrollTrigger :
      // l'orbite se mesure mal tant que les polices et les images au-dessus
      // n'ont pas fini de pousser la page, et la révélation restait bloquée.
      const tl = gsap.timeline({ paused: true });
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            tl.play();
            io.disconnect();
          }
        },
        { threshold: 0.2 },
      );
      io.observe(root);
      tl.fromTo(
        root.querySelectorAll("[data-ring]"),
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 1.6, ease: "expo.out", stagger: 0.15 },
      ).fromTo(
        root.querySelectorAll("[data-node]"),
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: 0.6, ease: "expo.out", stagger: 0.05 },
        "-=1.1",
      );
      return () => io.disconnect();
    });
    return () => mm.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16"
      onMouseLeave={() => setPaused(false)}
    >
      {/* Orbite (desktop et tablette) */}
      <div className="relative hidden sm:block aspect-square w-full max-w-[640px] mx-auto">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
          <circle
            data-ring
            cx="50"
            cy="50"
            r={R_OUTER}
            fill="none"
            stroke="rgb(248 244 236 / 0.16)"
            strokeWidth="0.18"
            pathLength={1}
            strokeDasharray="1"
          />
          <circle
            data-ring
            cx="50"
            cy="50"
            r={R_INNER}
            fill="none"
            stroke="rgb(248 244 236 / 0.22)"
            strokeWidth="0.18"
            pathLength={1}
            strokeDasharray="1"
          />
          <line
            key={active}
            x1="50"
            y1="50"
            x2={node.x}
            y2={node.y}
            stroke="#F8F4EC"
            strokeWidth="0.3"
            pathLength={1}
            strokeDasharray="1"
            className="animate-[orbit-draw_0.7s_cubic-bezier(0.16,1,0.3,1)_both]"
          />
        </svg>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center size-[22%] rounded-full bg-cream text-ink shadow-[0_0_0_10px_rgb(248_244_236/0.06)]">
          <span className="font-heading text-[clamp(1rem,2vw,1.5rem)] leading-none">Horkos</span>
        </div>

        {NODES.map((n, i) => (
          <button
            key={n.title}
            type="button"
            data-node
            onMouseEnter={() => {
              setPaused(true);
              setActive(i);
            }}
            onFocus={() => {
              setPaused(true);
              setActive(i);
            }}
            onClick={() => {
              setPaused(true);
              setActive(i);
            }}
            aria-pressed={active === i}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            // Le point tombe exactement sur l'anneau ; le nom, vers l'extérieur.
            className={`group absolute grid size-3 -translate-x-1/2 -translate-y-1/2 place-items-center text-[13px] lg:text-[14px] transition-colors duration-300 ${
              active === i ? "text-cream" : "text-cream-muted hover:text-cream"
            }`}
          >
            <span
              aria-hidden="true"
              className={`block size-3 rounded-full ring-1 transition-colors duration-300 ${
                active === i ? "bg-cream ring-cream" : "bg-ink ring-cream/40 group-hover:ring-cream"
              }`}
            />
            <span
              className="absolute whitespace-nowrap"
              style={{
                left: `calc(50% + ${n.ca * 14}px)`,
                top: `calc(50% + ${n.sa * 14}px)`,
                transform: `translate(${-50 + n.ca * 50}%, ${-50 + n.sa * 50}%)`,
              }}
            >
              {n.title}
            </span>
          </button>
        ))}
      </div>

      {/* Panneau d'explication */}
      <div aria-live="polite" className="hidden sm:block">
        <h3 className="display-md text-cream">{node.title}</h3>
        <p className="mt-5 text-[17px] leading-relaxed text-cream-muted">{node.desc}</p>
        <p className="mt-4 text-[14px] text-cream-muted">Cercle : {CERCLES[node.cercle].toLowerCase()}</p>
        <div className="mt-8 flex items-center gap-3 text-[14px] text-cream-muted">
          <span className="tabular-nums text-cream">{String(active + 1).padStart(2, "0")}</span>
          <span className="h-px flex-1 bg-cream/15">
            <span
              className="block h-px bg-cream transition-[width] duration-500"
              style={{ width: `${((active + 1) / NODES.length) * 100}%` }}
            />
          </span>
          <span className="tabular-nums">{String(NODES.length).padStart(2, "0")}</span>
        </div>
      </div>

      {/* Mobile : deux listes, sans orbite */}
      <div className="sm:hidden space-y-10">
        {(Object.keys(CERCLES) as (keyof typeof CERCLES)[]).map((c) => (
          <div key={c}>
            <h3 className="font-sans text-[15px] font-medium tracking-normal text-cream">{CERCLES[c]}</h3>
            <ul className="mt-3 divide-y divide-cream/10 border-y border-cream/10">
              {METIERS.filter((m) => m.cercle === c).map((m) => (
                <li key={m.title} className="py-4">
                  <p className="font-heading text-[22px] text-cream">{m.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-cream-muted">{m.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
