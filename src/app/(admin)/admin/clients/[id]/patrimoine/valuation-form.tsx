"use client";

import { useActionState, useEffect } from "react";
import { recordValuation } from "./actions";
import type { ActionState } from "@/lib/staff";

const initialState: ActionState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

export function ValuationForm({
  clientId,
  assetId,
  onCancel,
  onSuccess,
}: {
  clientId: string;
  assetId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(recordValuation, initialState);

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state, onSuccess]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="assetId" value={assetId} />

      <div>
        <label htmlFor="v_value" className="block text-[12px] font-medium text-ink mb-1.5">
          Valeur relevée (MAD)
        </label>
        <input
          id="v_value"
          name="value"
          type="number"
          min="0"
          step="1"
          required
          className={`${field} tabular-nums`}
        />
      </div>

      <div>
        <label htmlFor="valued_at" className="block text-[12px] font-medium text-ink mb-1.5">
          Date du relevé
        </label>
        <input
          id="valued_at"
          name="valued_at"
          type="date"
          required
          defaultValue={today}
          max={today}
          className={`${field} cursor-pointer`}
        />
        <p className="text-[11.5px] text-warm-grey mt-1">
          Si c&apos;est le relevé le plus récent, il devient la valeur affichée au client.
        </p>
      </div>

      {state.status === "error" && state.message && (
        <p className="text-[12.5px] text-red-600" aria-live="polite">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-5 text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {pending ? "Enregistrement…" : "Enregistrer le relevé"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-10 px-4 inline-flex items-center text-[13px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
