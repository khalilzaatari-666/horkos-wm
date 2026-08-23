"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Below this, the shift can't move a trigger past a meaningful boundary. */
const MIN_SHIFT_PX = 8;
const DEBOUNCE_MS = 150;

/**
 * Keeps ScrollTrigger's cached positions honest when the page height changes.
 *
 * Every reveal on the site renders at `opacity: 0` and waits for a trigger
 * whose start offset is measured once, at creation. Anything that changes the
 * document height afterwards - a form replaced by its confirmation, an
 * accordion opening, a card expanding - moves the sections below without
 * ScrollTrigger noticing, so their reveals never fire and the content stays
 * invisible with only the section backgrounds showing.
 *
 * GSAP refreshes on resize and load out of the box, but not on arbitrary DOM
 * changes. One observer here spares every interactive component from having to
 * remember to refresh, and covers ones not written yet.
 */
export function ScrollRefresh() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lastHeight = document.documentElement.scrollHeight;
    let timer: number | undefined;

    const observer = new ResizeObserver(() => {
      const height = document.documentElement.scrollHeight;
      if (Math.abs(height - lastHeight) < MIN_SHIFT_PX) return;
      lastHeight = height;

      window.clearTimeout(timer);
      // Debounced: a CSS height transition fires this on every frame, and
      // refreshing mid-transition would measure a position that is still moving.
      timer = window.setTimeout(() => ScrollTrigger.refresh(), DEBOUNCE_MS);
    });

    observer.observe(document.body);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
