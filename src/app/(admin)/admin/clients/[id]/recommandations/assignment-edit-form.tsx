"use client";

import { useActionState, useEffect } from "react";
import { updateAssignment } from "./actions";
import { ASSIGNMENT_STATUS } from "@/lib/recommandation-status";
import type { ActionState } from "@/lib/staff";

const initialState: ActionState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

export function AssignmentEditForm({
  clientId,
  assignment,
  onCancel,
  onSuccess,
}: {
  clientId: string;
  assignment: { id: string; status: string; notes: string };
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateAssignment, initialState);

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="id" value={assignment.id} />

      <div>
        <label htmlFor="status" className="block text-[12px] font-medium text-ink mb-1.5">
          Statut
        </label>
        <select id="status" name="status" defaultValue={assignment.status} className={`${field} cursor-pointer`}>
          {ASSIGNMENT_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-[12px] font-medium text-ink mb-1.5">
          Mot du conseiller <span className="text-warm-grey font-normal">(visible du client)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={assignment.notes}
          className="w-full px-3 py-2.5 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors leading-[1.6] resize-y"
        />
      </div>

      {state.status === "error" && state.message && (
        <p className="text-[12.5px] text-red-600" aria-live="polite">{state.message}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className="h-10 px-5 text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onCancel} className="h-10 px-4 inline-flex items-center text-[13px] text-warm-grey hover:text-ink transition-colors cursor-pointer">
          Annuler
        </button>
      </div>
    </form>
  );
}
