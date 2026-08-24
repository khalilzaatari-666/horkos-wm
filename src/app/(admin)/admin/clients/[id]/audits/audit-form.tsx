"use client";

import { useActionState, useEffect } from "react";
import { DocumentUpload } from "@/components/admin/document-upload";
import type { ActionState } from "@/lib/staff";

const initialState: ActionState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

export interface AuditInitial {
  id?: string;
  status: string;
  hasReport: boolean;
}

export function AuditForm({
  clientId,
  action,
  initial,
  onCancel,
  onSuccess,
}: {
  clientId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: AuditInitial;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label htmlFor="status" className="block text-[12px] font-medium text-ink mb-1.5">
          Statut
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initial?.status ?? "en_cours"}
          className={`${field} cursor-pointer`}
        >
          <option value="en_cours">En cours</option>
          <option value="termine">Terminé</option>
        </select>
      </div>

      <DocumentUpload
        clientId={clientId}
        pathPrefix="audits"
        accept="application/pdf"
        label="Rapport d'audit (PDF)"
        hint={
          initial?.hasReport
            ? "Un rapport est déjà joint. Déposez un fichier pour le remplacer, ou laissez vide."
            : "Optionnel. Le client pourra le télécharger depuis sa page patrimoine."
        }
      />

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
          {pending ? "Enregistrement…" : "Enregistrer"}
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
