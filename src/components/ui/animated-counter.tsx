"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedCounterProps {
  value: string;
  className?: string;
  delay?: number;
}

export function AnimatedCounter({ value, className = "", delay = 0 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.style.opacity = "1";
      el.textContent = value;
      return;
    }

    const numericValue = parseInt(value, 10);
    // Counting up to a single digit spends most of its run showing "0", so only
    // roll numbers that actually have somewhere to travel. Anything else pops in.
    const shouldCount = !isNaN(numericValue) && numericValue >= 10;

    if (shouldCount) {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: numericValue,
        duration: 1.2,
        delay: delay / 1000,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none",
        },
        onStart: () => {
          el.style.opacity = "1";
        },
        onUpdate: () => {
          el.textContent = String(Math.round(obj.val)).padStart(value.length, "0");
        },
      });
    } else {
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.5 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          delay: delay / 1000,
          ease: "back.out(2)",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [value, delay]);

  return (
    <span ref={ref} className={className} style={{ opacity: 0 }}>
      {value}
    </span>
  );
}
