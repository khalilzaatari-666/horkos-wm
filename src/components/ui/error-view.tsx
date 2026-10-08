"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Corps commun des `error.tsx`. Le message reste générique : l'erreur d'origine
 * peut contenir un nom de table ou une URL interne, on la journalise seulement.
 *
 * `reset` relance le rendu du segment - il suffit dans le cas courant d'une base
 * momentanément injoignable. Le lien de repli ramène à une page rendue par un
 * autre segment, qui a donc toutes les chances de fonctionner.
 */
export function ErrorView({
  error,
  reset,
  title = "Une erreur est survenue",
  desc = "Le chargement de cette page a échoué. Réessayez dans un instant ; si le problème persiste, contactez-nous.",
  fallback,
  tone = "public",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  desc?: string;
  /** Lien de repli, vers une page hors du segment en erreur. */
  fallback: { href: string; label: string };
  /** `public` : bouton bronze. `admin` : sobre, bouton encre. */
  tone?: "public" | "admin";
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const primary =
    tone === "admin" ? "bg-ink text-cream hover:bg-navy" : "bg-ink text-white hover:bg-navy";

  return (
    <div className="flex flex-col items-center justify-center text-center px-7 py-16 min-h-[50vh]">
      <span className="text-[14px] text-warm-grey">Erreur</span>
      <h1 className="display-md text-ink mt-5">
        {title}
      </h1>
      <p className="text-charcoal text-[16px] leading-relaxed mt-4 max-w-[46ch]">{desc}</p>
      {error.digest && (
        <p className="text-[11.5px] text-warm-grey/80 mt-2 font-mono">Réf. {error.digest}</p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <button
          type="button"
          onClick={reset}
          className={`btn ${primary}`}
        >
          Réessayer
        </button>
        <Link
          href={fallback.href}
          className="btn btn-outline"
        >
          {fallback.label}
        </Link>
      </div>
    </div>
  );
}
