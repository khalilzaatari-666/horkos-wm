"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export type AnimationVariant =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale-in"
  | "reveal-up"
  | "rotate-in"
  | "blur-in";

interface AnimateInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  variant?: AnimationVariant;
  /** Overrides `variant` below 768px. Falls back to `variant` when omitted. */
  mobileVariant?: AnimationVariant;
  stagger?: number;
  once?: boolean;
}

/** Full-travel, 3D-friendly values - desktop has the GPU headroom for them. */
const desktopVariants: Record<AnimationVariant, gsap.TweenVars> = {
  "fade-up": { opacity: 0, y: 40 },
  "fade-down": { opacity: 0, y: -40 },
  "fade-left": { opacity: 0, x: -50 },
  "fade-right": { opacity: 0, x: 50 },
  "scale-in": { opacity: 0, scale: 0.85 },
  "reveal-up": { opacity: 0, y: 60, scale: 0.95 },
  "rotate-in": { opacity: 0, y: 30, rotateX: 15 },
  "blur-in": { opacity: 0, y: 20, filter: "blur(8px)" },
};

/**
 * Mobile: shorter travel (a 50px slide eats a third of a 375px viewport),
 * no 3D rotation and no blur filter - both stutter on mid-range phones.
 */
const mobileVariants: Record<AnimationVariant, gsap.TweenVars> = {
  "fade-up": { opacity: 0, y: 20 },
  "fade-down": { opacity: 0, y: -20 },
  "fade-left": { opacity: 0, x: -22 },
  "fade-right": { opacity: 0, x: 22 },
  "scale-in": { opacity: 0, scale: 0.94 },
  "reveal-up": { opacity: 0, y: 30, scale: 0.96 },
  "rotate-in": { opacity: 0, y: 22 },
  "blur-in": { opacity: 0, y: 14 },
};

/** Only reset the properties the `from` state actually touched. */
function restingState(from: gsap.TweenVars): gsap.TweenVars {
  const to: gsap.TweenVars = { opacity: 1 };
  if ("x" in from) to.x = 0;
  if ("y" in from) to.y = 0;
  if ("scale" in from) to.scale = 1;
  if ("rotateX" in from) to.rotateX = 0;
  if ("filter" in from) to.filter = "blur(0px)";
  return to;
}

export function AnimateIn({
  children,
  className = "",
  delay = 0,
  duration = 0.8,
  variant = "fade-up",
  mobileVariant,
  stagger,
  once = true,
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        isMobile: "(max-width: 767px)",
        isDesktop: "(min-width: 768px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { isMobile, reduceMotion } = context.conditions as {
          isMobile: boolean;
          isDesktop: boolean;
          reduceMotion: boolean;
        };

        const targets = stagger ? [el, ...Array.from(el.children)] : el;

        if (reduceMotion) {
          gsap.set(targets, { opacity: 1 });
          return;
        }

        const from = isMobile
          ? mobileVariants[mobileVariant ?? variant]
          : desktopVariants[variant];

        const dur = isMobile ? duration * 0.75 : duration;
        const toVars: gsap.TweenVars = {
          ...restingState(from),
          duration: dur,
          delay: delay / 1000,
          ease: "power3.out",
        };

        // Un élément déjà à l'écran au montage doit se révéler tout de suite :
        // lui attacher un ScrollTrigger le laisserait à opacity 0 tant qu'aucun
        // défilement ne survient - or il n'y en a pas si tout tient dans la
        // fenêtre (page de connexion, back-office). On ne garde le déclencheur
        // au défilement que pour ce qui est encore sous la ligne de flottaison.
        const inView = el.getBoundingClientRect().top < window.innerHeight * 0.92;
        if (!inView) {
          toVars.scrollTrigger = {
            trigger: el,
            start: isMobile ? "top 92%" : "top 88%",
            toggleActions: once ? "play none none none" : "play none none reverse",
          };
        }

        let tween: gsap.core.Tween;
        if (stagger) {
          gsap.set(el, { opacity: 1 });
          tween = gsap.fromTo(el.children, from, { ...toVars, stagger });
        } else {
          tween = gsap.fromTo(el, from, toVars);
        }

        // Filet de sécurité : si l'animation d'un élément visible ne s'est pas
        // achevée à temps (onglet en arrière-plan au chargement dont le ticker
        // rAF est ralenti, échec GSAP…), on tue le tween puis on force l'état
        // final - sans tuer le tween d'abord, sa prochaine image écraserait la
        // valeur qu'on vient de poser. Le contenu sous la ligne de flottaison
        // garde son déclencheur au défilement, sans filet.
        if (inView) {
          const ms = (delay / 1000 + dur) * 1000 + 600;
          const failsafe = window.setTimeout(() => {
            tween.kill();
            gsap.set(targets, restingState(from));
          }, ms);
          return () => window.clearTimeout(failsafe);
        }
      }
    );

    return () => mm.revert();
  }, [delay, duration, variant, mobileVariant, stagger, once]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
