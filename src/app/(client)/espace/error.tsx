"use client";

import { Panel } from "@/components/client/ui";
import { ErrorView } from "@/components/ui/error-view";

/** Erreur d'une page de l'espace client : la barre latérale reste en place. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Panel narrow>
      <ErrorView
        error={error}
        reset={reset}
        desc="Le chargement de cette section a échoué. Réessayez dans un instant ; si le problème persiste, votre conseiller reste joignable."
        fallback={{ href: "/espace", label: "Retour à mon espace" }}
      />
    </Panel>
  );
}
