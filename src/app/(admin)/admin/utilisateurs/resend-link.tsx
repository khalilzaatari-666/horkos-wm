"use client";

import { useActionState } from "react";
import { resendSetPasswordLink, type ResendState } from "./actions";

const initialState: ResendState = { status: "idle" };

/**
 * Renvoie à un membre de l'équipe son lien de définition de mot de passe.
 * N'apparaît que sur les lignes conseiller/admin : un client se connecte par
 * code et n'a pas de mot de passe à définir.
 */
export function ResendLink({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(resendSetPasswordLink, initialState);

  return (
    <form action={formAction} className="mt-1.5">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="text-[11.5px] font-medium text-bronze-dark hover:text-bronze underline underline-offset-2 decoration-cream-deep hover:decoration-bronze transition-colors cursor-pointer disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Renvoyer le lien de mot de passe"}
      </button>

      {state.status === "error" && (
        <p className="text-[11.5px] text-red-600 mt-1 leading-[1.45] max-w-[240px]">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p className="text-[11.5px] text-emerald-700 mt-1 leading-[1.45] max-w-[240px]">
          {state.message}
        </p>
      )}
    </form>
  );
}
