"use client";

import { useActionState, useEffect, useRef } from "react";
import { getStaffAuditUrl, type AuditUrlState } from "./actions";

const initialState: AuditUrlState = { status: "idle" };

export function AuditOpenButton({ auditId }: { auditId: string }) {
  const [state, formAction, pending] = useActionState(getStaffAuditUrl, initialState);
  const opened = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.status !== "ready" || !state.url || opened.current === state.url) return;
    opened.current = state.url;
    window.open(state.url, "_blank", "noopener,noreferrer");
  }, [state]);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="auditId" value={auditId} />
      <button
        type="submit"
        disabled={pending}
        title={state.status === "error" ? state.message : undefined}
        className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium transition-colors cursor-pointer disabled:opacity-60"
      >
        {pending ? "Ouverture…" : "Ouvrir le rapport"}
      </button>
    </form>
  );
}
