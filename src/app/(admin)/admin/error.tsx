"use client";

import { AdminPanel } from "@/components/admin/ui";
import { ErrorView } from "@/components/ui/error-view";

/** Erreur d'une page du back-office : la barre latérale reste en place. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AdminPanel>
      <ErrorView
        error={error}
        reset={reset}
        tone="admin"
        desc="Le chargement de cette page a échoué. Réessayez ; si le problème persiste, notez la référence ci-dessous."
        fallback={{ href: "/admin", label: "Tableau de bord" }}
      />
    </AdminPanel>
  );
}
