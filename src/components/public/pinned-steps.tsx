"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface PinnedStep {
  /** Ce que l'étape porte de séquentiel : un numéro ou un jalon (R0, R1…). */
  mark: string;
  title: string;
  desc: string;
  fragment?: ReactNode;
}

/**
 * Une méthode en étapes. Sur grand écran, la section se fixe et les étapes
 * défilent à l'horizontale pendant qu'on descend ; ailleurs - mobile, ou
 * mouvement réduit - elles s'empilent simplement.
 */
export function PinnedSteps({
  intro,
  steps,
  tone = "white",
}: {
  intro: ReactNode;
  steps: PinnedStep[];
  /** `panel` : tout le bloc dans un panneau crème profonde inséré, étapes en cartes blanches. */
  tone?: "white" | "panel";
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  // La mise en rangée n'existe que si l'épinglage tourne : sans lui (mouvement
  // réduit), une rangée plus large que l'écran serait simplement rognée.
  const [pinned, setPinned] = useState(false);

  // Le choix de la mise en page suit l'écran et la préférence de mouvement.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    const sync = () => setPinned(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // L'épinglage se monte une fois la rangée en place, pour mesurer la bonne
  // largeur.
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!pinned || !section || !track) return;

    const clip = clipRef.current;
    const distance = () => track.scrollWidth - (clip ? clip.clientWidth : window.innerWidth);
    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "center center",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });
    }, section);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [pinned]);

  return (
    // L'épinglage enveloppe la section dans un `pin-spacer` créé par GSAP. Ce
    // conteneur extérieur, lui, ne bouge jamais : React peut le retirer en
    // quittant la page, même quand la section est posée à la racine de celle-ci
    // (sans lui, « removeChild » échoue et la navigation tombe en erreur).
    <div>
      <div ref={sectionRef} className={tone === "panel" ? "shell py-3 lg:py-4" : "relative overflow-hidden bg-white"}>
        <div
          ref={clipRef}
          className={
            tone === "panel"
              ? "panel overflow-hidden py-16 lg:py-20"
              : pinned
                ? "overflow-hidden"
                : ""
          }
        >
          <div
            ref={trackRef}
            className={
              pinned
                ? tone === "panel"
                  ? "flex flex-row items-stretch gap-5 w-max px-16"
                  : "flex flex-row items-stretch gap-6 w-max pl-[max(40px,calc((100vw-1320px)/2+40px))] pr-[10vw]"
                : tone === "panel"
                  ? "flex flex-col gap-5 px-6 sm:px-12"
                  : "shell flex flex-col gap-6 section-y"
            }
          >
            <div className={pinned ? "w-[min(440px,34vw)] shrink-0 flex flex-col justify-center pr-10" : "mb-6 max-w-[640px]"}>
              {intro}
            </div>

            {steps.map((s) => (
              <article
                key={s.mark}
                className={`${tone === "panel" ? "bg-white rounded-[20px]" : "panel"} relative overflow-hidden grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_minmax(0,340px)] lg:items-end lg:p-12 ${
                  pinned ? "w-[min(800px,58vw)] min-h-[min(400px,52vh)] shrink-0 lg:items-center" : "lg:items-center"
                }`}
              >
                <div className="flex flex-col h-full">
                  <span className="font-heading font-light text-[clamp(3.5rem,6vw,5.5rem)] leading-[0.85] tracking-[-0.04em] text-ink">
                    {s.mark}
                  </span>
                  <div className="pt-6">
                    <h3 className="display-md text-ink">{s.title}</h3>
                    <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-charcoal">{s.desc}</p>
                  </div>
                </div>
                {s.fragment && <div className="self-center lg:self-end">{s.fragment}</div>}
              </article>
            ))}
          </div>

          <div aria-hidden="true" className={pinned ? (tone === "panel" ? "mx-16 mt-10" : "shell mt-10") : "hidden"}>
            <span className="block h-px bg-ink/10">
              <span ref={barRef} className="block h-px origin-left scale-x-0 bg-ink" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
