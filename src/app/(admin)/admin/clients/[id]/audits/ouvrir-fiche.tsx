"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ouvrirFiche, type OuvertureState } from "./[auditId]/actions";

const initialState: OuvertureState = { status: "idle" };

/**
 * Ouvre la fiche d'audit d'un rendez-vous et y conduit.
 *
 * Le bouton ne crée rien s'il existe déjà une fiche pour ce rendez-vous :
 * l'action relit avant d'insérer et rend l'existante. Deux conseillers qui
 * cliquent en même temps arrivent donc sur la même fiche.
 */
export function OuvrirFicheButton({
  clientId,
  appointmentId,
  libelle = "Ouvrir la fiche d'audit",
}: {
  clientId: string;
  appointmentId?: string;
  libelle?: string;
}) {
  const [state, formAction, pending] = useActionState(ouvrirFiche, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.auditId) router.push(`/admin/clients/${clientId}/audits/${state.auditId}`);
  }, [state.auditId, clientId, router]);

  return (
    <form action={formAction} className="inline-flex flex-col gap-1.5">
      <input type="hidden" name="clientId" value={clientId} />
      {appointmentId && <input type="hidden" name="appointmentId" value={appointmentId} />}
      <button
        type="submit"
        disabled={pending}
        className="h-9 px-3.5 inline-flex items-center text-[12.5px] font-medium border border-bronze/40 text-bronze-dark rounded-lg hover:bg-cream disabled:opacity-40 transition-colors cursor-pointer"
      >
        {pending ? "Ouverture…" : libelle}
      </button>
      {state.status === "error" && state.message && (
        <span className="text-[11.5px] text-red-600" aria-live="polite">
          {state.message}
        </span>
      )}
    </form>
  );
}
