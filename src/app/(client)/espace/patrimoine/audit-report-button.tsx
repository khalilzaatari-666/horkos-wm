"use client";

import { useActionState, useEffect, useRef } from "react";
import { getAuditReportUrl, type AuditReportState } from "./actions";

const initialState: AuditReportState = { status: "idle" };

/**
 * Télécharge le rapport d'audit. L'URL est signée au clic (une minute) plutôt
 * que posée dans le HTML : une pièce patrimoniale ne doit pas rester ouverte
 * dans l'historique du navigateur ou les journaux du proxy.
 */
export function AuditReportButton({ auditId }: { auditId: string }) {
  const [state, formAction, pending] = useActionState(getAuditReportUrl, initialState);
  const opened = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.status !== "ready" || !state.url || opened.current === state.url) return;
    opened.current = state.url;
    window.open(state.url, "_blank", "noopener,noreferrer");
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="auditId" value={auditId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-block px-5 py-2.5 text-[13px] font-medium text-ink border border-cream-deep rounded-lg hover:border-bronze transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
      >
        {pending ? "Ouverture…" : "Télécharger le rapport"}
      </button>
      {state.status === "error" && (
        <p className="text-[11.5px] text-red-600 mt-1.5">{state.message}</p>
      )}
    </form>
  );
}
