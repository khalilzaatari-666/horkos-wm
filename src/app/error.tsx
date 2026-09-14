"use client";

import { ErrorView } from "@/components/ui/error-view";

/**
 * Erreur d'une page hors des deux espaces (site public, auth). Placé à la
 * racine : les groupes (public) et (client)/(admin) ont chacun leur layout, et
 * ceux des espaces déclarent leur propre `error.tsx` plus bas.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <ErrorView error={error} reset={reset} fallback={{ href: "/", label: "Retour à l'accueil" }} />
    </div>
  );
}
