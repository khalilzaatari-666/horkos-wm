"use client";

import { useActionState, useEffect, useRef } from "react";
import { getStaffDocumentUrl, type OpenState } from "./actions";

const initialState: OpenState = { status: "idle" };

/**
 * Ouvre un document dans un onglet via une URL signée d'une minute, demandée au
 * clic - jamais posée dans le HTML, pour ne pas laisser traîner une pièce
 * patrimoniale dans l'historique du navigateur.
 */
export function DocumentOpenButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(getStaffDocumentUrl, initialState);
  const opened = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.status !== "ready" || !state.url || opened.current === state.url) return;
    opened.current = state.url;
    window.open(state.url, "_blank", "noopener,noreferrer");
  }, [state]);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="documentId" value={id} />
      <button
        type="submit"
        disabled={pending}
        title={state.status === "error" ? state.message : undefined}
        className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium transition-colors cursor-pointer disabled:opacity-60"
      >
        {pending ? "Ouverture…" : "Ouvrir"}
      </button>
    </form>
  );
}
