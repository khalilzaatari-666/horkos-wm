"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { demanderEchange, type EchangeState } from "./actions";

const initialState: EchangeState = { status: "idle" };

/**
 * Prévient le conseiller en un clic.
 *
 * Le bouton disparaît une fois la demande partie : le laisser inviterait à
 * cliquer encore, et chaque clic est un email de plus chez le conseiller.
 */
export function DemanderEchange({ recommendationId }: { recommendationId: string }) {
  const [state, formAction, pending] = useActionState(demanderEchange, initialState);

  if (state.status === "success") {
    return (
      <p className="inline-flex items-center gap-2 mt-4 text-[13px] font-medium text-bronze-dark">
        <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
        Votre conseiller a été prévenu, il revient vers vous.
      </p>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="recommendationId" value={recommendationId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-block mt-4 px-5 py-2.5 text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {pending ? "Envoi…" : "En parler avec mon conseiller"}
      </button>
      {state.status === "error" && state.message && (
        <p className="text-[12.5px] text-red-600 mt-2.5" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
