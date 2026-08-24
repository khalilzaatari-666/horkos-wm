"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Fenêtre modale du back-office. Rendue via un portail sur `document.body` pour
 * échapper au découpage d'un tableau (`overflow`) ou d'un ancêtre transformé par
 * GSAP - un `position: fixed` s'y retrouverait sinon mal placé ou coupé.
 */
export function AdminModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[720px] max-h-[92vh] sm:max-h-[88vh] overflow-y-auto bg-cream sm:rounded-2xl rounded-t-2xl border border-cream-deep shadow-xl"
      >
        <div className="sticky top-0 z-10 bg-cream border-b border-cream-deep px-6 py-4 flex items-center justify-between gap-3">
          <h2 className="font-heading text-[18px] font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 -mr-1.5 grid place-items-center w-8 h-8 rounded-lg text-warm-grey hover:text-ink hover:bg-cream-deep transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
