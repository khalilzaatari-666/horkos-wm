"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

gsap.registerPlugin(Observer, ScrollTrigger);

interface MarqueeRowProps {
  items: React.ReactNode[];
  /** Travel direction of the cards. */
  direction?: "left" | "right";
  /** Pixels per second. Low and steady reads as premium; fast reads as an ad. */
  speed?: number;
  /** Width of one card, as Tailwind classes. */
  cardWidth?: string;
  className?: string;
}

const GAP_PX = 14;
/** Multiple de la vitesse normale sous une flèche maintenue. */
const BOOST = 4;
/** Durée plancher d'une poussée, pour qu'un clic bref se voie quand même. */
const MIN_BOOST_MS = 450;
/** Réserve de cycles derrière la tête de lecture, pour la marche arrière. */
const REVERSE_HEADROOM_CYCLES = 1000;

/**
 * Seamless infinite row.
 *
 * The track holds N identical copies of `items`. One copy plus one gap is the
 * stride: translating by exactly that distance lands the row back on an
 * identical frame, so `repeat: -1` loops with no seam. Everything else -
 * hover, drag, offscreen pausing - drives the tween's `progress()` rather than
 * `x`, which keeps the wrap arithmetic exact no matter how far it is nudged.
 */
export function MarqueeRow({
  items,
  direction = "left",
  speed = 34,
  cardWidth = "w-[248px] sm:w-[272px]",
  className = "",
}: MarqueeRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(2);
  const reduced = usePrefersReducedMotion();

  // La boucle naît dans l'effet ; les flèches, elles, vivent au rendu. Ces refs
  // sont le seul lien entre les deux.
  const loopRef = useRef<gsap.core.Tween | null>(null);
  const hoveringRef = useRef(false);

  const easeTimeScale = (value: number, duration: number) => {
    const loop = loopRef.current;
    if (loop) gsap.to(loop, { timeScale: value, duration, ease: "power2.out", overwrite: true });
  };

  // Une flèche tire le contenu de son côté : la flèche droite fait donc défiler
  // les cartes vers la gauche, ce qui découvre les suivantes à droite. Quand la
  // rangée va déjà dans ce sens, c'est son sens naturel ; sinon on la remonte.
  const boost = (side: "left" | "right") => {
    const forward = (side === "right") === (direction === "left");
    easeTimeScale(forward ? BOOST : -BOOST, 0.3);
  };

  // Relâcher au-dessus du carrousel doit retrouver l'arrêt au survol, pas la
  // vitesse normale - sinon la rangée repart alors que le curseur est dessus.
  const release = () => easeTimeScale(hoveringRef.current ? 0 : 1, 0.45);

  // Enough copies that the track always overflows the viewport by a full stride,
  // otherwise the loop reset would expose empty space on wide screens.
  useEffect(() => {
    if (reduced) return;
    const container = containerRef.current;
    const copy = copyRef.current;
    if (!container || !copy) return;

    const measure = () => {
      const stride = copy.getBoundingClientRect().width + GAP_PX;
      if (!stride) return;
      const needed = Math.max(2, Math.ceil(container.getBoundingClientRect().width / stride) + 1);
      setCopies((current) => (current === needed ? current : needed));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(copy);
    return () => ro.disconnect();
  }, [reduced, items.length]);

  useEffect(() => {
    if (reduced) return;
    const container = containerRef.current;
    const track = trackRef.current;
    const copy = copyRef.current;
    if (!container || !track || !copy) return;

    const ctx = gsap.context(() => {
      const stride = copy.getBoundingClientRect().width + GAP_PX;
      if (!stride) return;

      const from = direction === "left" ? 0 : -stride;
      const to = direction === "left" ? -stride : 0;

      gsap.set(track, { x: from });
      const loop = gsap.to(track, {
        x: to,
        duration: stride / speed,
        ease: "none",
        repeat: -1,
      });

      // Une boucle infinie démarre à l'instant zéro : la lire à l'envers l'y
      // ramène en quelques secondes et elle s'arrête, faute de cycles derrière
      // elle. On avance la tête de lecture de mille cycles - position visuelle
      // identique, mais la marche arrière a désormais de quoi courir.
      loop.totalTime(loop.duration() * REVERSE_HEADROOM_CYCLES);
      loopRef.current = loop;

      // Hover eases the row to a stop instead of cutting it, and back up again.
      const slowTo = (timeScale: number) =>
        gsap.to(loop, { timeScale, duration: 0.45, ease: "power2.out", overwrite: true });

      const canHover = window.matchMedia("(hover: hover)").matches;
      const onEnter = () => {
        hoveringRef.current = true;
        slowTo(0);
      };
      const onLeave = () => {
        hoveringRef.current = false;
        slowTo(1);
      };
      if (canHover) {
        container.addEventListener("mouseenter", onEnter);
        container.addEventListener("mouseleave", onLeave);
      }

      // Don't burn frames on a row nobody is looking at.
      const trigger = ScrollTrigger.create({
        trigger: container,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
      });

      // Push the row by hand. Nudging `progress` keeps it inside the loop.
      const wrapProgress = gsap.utils.wrap(0, 1);
      const dragSign = direction === "left" ? -1 : 1;
      let dragged = false;
      // L'appui sur une flèche remonte jusqu'ici : sans ça, l'Observer écraserait
      // la poussée par un arrêt, et un appui maintenu ferait glisser la rangée.
      let onArrow = false;
      const observer = Observer.create({
        target: container,
        type: "touch,pointer",
        dragMinimum: 4,
        onPress: (self) => {
          onArrow = Boolean((self.event.target as HTMLElement)?.closest?.("[data-marquee-arrow]"));
          if (onArrow) return;
          dragged = false;
          slowTo(0);
        },
        onRelease: () => {
          if (!onArrow) slowTo(1);
        },
        onDrag: (self) => {
          if (onArrow) return;
          dragged = true;
          loop.progress(wrapProgress(loop.progress() + (dragSign * self.deltaX) / stride));
        },
      });

      // Releasing a drag over a card would otherwise count as a click on it and
      // navigate away. Capture phase, so the link never sees the event.
      const swallowClick = (e: MouseEvent) => {
        if (!dragged) return;
        e.preventDefault();
        e.stopPropagation();
        dragged = false;
      };
      container.addEventListener("click", swallowClick, true);

      return () => {
        container.removeEventListener("mouseenter", onEnter);
        container.removeEventListener("mouseleave", onLeave);
        container.removeEventListener("click", swallowClick, true);
        trigger.kill();
        observer.kill();
        loopRef.current = null;
      };
    }, container);

    return () => ctx.revert();
  }, [copies, direction, speed, reduced, items.length]);

  // The duplicated copies are `aria-hidden`, but a link inside stays tabbable -
  // which would walk a keyboard user through the same cards once per copy. They
  // must stay clickable though, since a duplicate is often the one on screen,
  // so `inert` is out and the tab order is trimmed by hand.
  useEffect(() => {
    trackRef.current
      ?.querySelectorAll<HTMLElement>("[data-duplicate] a, [data-duplicate] button")
      .forEach((el) => {
        el.tabIndex = -1;
      });
  }, [copies, items]);

  const renderCopy = (copyIndex: number) => (
    <div
      key={copyIndex}
      ref={copyIndex === 0 ? copyRef : undefined}
      className="flex shrink-0"
      style={{ gap: GAP_PX }}
      aria-hidden={copyIndex > 0}
      data-duplicate={copyIndex > 0 ? "" : undefined}
    >
      {items.map((item, i) => (
        <div key={i} className={`shrink-0 ${cardWidth}`}>
          {item}
        </div>
      ))}
    </div>
  );

  // No motion means no duplicates either - a plain scrollable row, swipeable.
  // The arrows step it by one card instead of accelerating anything, and jump
  // rather than glide: a smooth scroll would be the very motion being avoided.
  if (reduced) {
    const step = (side: "left" | "right") => {
      const strip = stripRef.current;
      const card = strip?.firstElementChild;
      if (!strip || !card) return;
      const by = card.getBoundingClientRect().width + GAP_PX;
      strip.scrollBy({ left: side === "left" ? -by : by, behavior: "auto" });
    };

    return (
      <div className={`group relative ${className}`}>
        <div
          ref={stripRef}
          className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ gap: GAP_PX }}
        >
          {items.map((item, i) => (
            <div key={i} className={`shrink-0 ${cardWidth}`}>
              {item}
            </div>
          ))}
        </div>

        <Arrow side="left" onBoost={step} onRelease={() => {}} />
        <Arrow side="right" onBoost={step} onRelease={() => {}} />
      </div>
    );
  }

  // The row takes the width of whatever wraps it, and the mask fades both ends
  // instead of cutting them - so the cards leaving the frame dissolve rather
  // than disappearing against a hard edge. The mask sits on the inner track
  // rather than the container, or it would fade the arrows out too.
  return (
    <div
      ref={containerRef}
      className={`group relative cursor-grab active:cursor-grabbing ${className}`}
    >
      <div
        className="overflow-hidden py-3"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
        }}
      >
        <div ref={trackRef} className="flex w-max" style={{ gap: GAP_PX }}>
          {Array.from({ length: copies }, (_, i) => renderCopy(i))}
        </div>
      </div>

      <Arrow side="left" onBoost={boost} onRelease={release} />
      <Arrow side="right" onBoost={boost} onRelease={release} />
    </div>
  );
}

/**
 * Accélère la rangée tant qu'on la maintient. Un clic bref donne quand même une
 * poussée visible : sans durée minimale, l'accélération serait annulée avant
 * d'avoir eu le temps de se voir.
 */
function Arrow({
  side,
  onBoost,
  onRelease,
}: {
  side: "left" | "right";
  onBoost: (side: "left" | "right") => void;
  onRelease: () => void;
}) {
  const pressedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const press = () => {
    window.clearTimeout(timer.current);
    pressedAt.current = Date.now();
    onBoost(side);
  };

  const lift = () => {
    const held = Date.now() - pressedAt.current;
    window.clearTimeout(timer.current);
    if (held >= MIN_BOOST_MS) {
      onRelease();
      return;
    }
    timer.current = window.setTimeout(onRelease, MIN_BOOST_MS - held);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      data-marquee-arrow
      aria-label={side === "left" ? "Faire défiler vers la gauche" : "Faire défiler vers la droite"}
      onPointerDown={press}
      onPointerUp={lift}
      onPointerLeave={lift}
      onPointerCancel={lift}
      // Le clavier n'émet pas d'évènements pointeur : Entrée et Espace donnent
      // la même poussée que le clic.
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") press();
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") lift();
      }}
      className={`absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-cream-deep text-ink shadow-sm cursor-pointer transition-all duration-200 hover:border-bronze hover:text-bronze focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 ${
        side === "left" ? "left-2" : "right-2"
      }`}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {side === "left" ? <path d="M15 5 8 12l7 7" /> : <path d="m9 5 7 7-7 7" />}
      </svg>
    </button>
  );
}
