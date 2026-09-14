"use client";

import { ErrorView } from "@/components/ui/error-view";

/** Erreur d'une page du site public : l'en-tête et le pied restent affichés. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView error={error} reset={reset} fallback={{ href: "/", label: "Retour à l'accueil" }} />;
}
