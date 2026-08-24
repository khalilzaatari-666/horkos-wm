"use client";

import { useActionState, useEffect } from "react";
import { DocumentUpload } from "@/components/admin/document-upload";
import { DOCUMENT_RUBRIQUES } from "@/lib/documents";
import { attachDocument } from "./actions";
import type { ActionState } from "@/lib/staff";

const initialState: ActionState = { status: "idle" };

export function DocumentUploadForm({
  clientId,
  onCancel,
  onSuccess,
}: {
  clientId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(attachDocument, initialState);

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />

      <div>
        <label htmlFor="category" className="block text-[12px] font-medium text-ink mb-1.5">
          Rubrique
        </label>
        <select
          id="category"
          name="category"
          defaultValue={DOCUMENT_RUBRIQUES[0].key}
          className="w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors cursor-pointer"
        >
          {DOCUMENT_RUBRIQUES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <DocumentUpload
        clientId={clientId}
        label="Fichier"
        hint="PDF ou image, 20 Mo maximum. Le client le verra dans son coffre-fort."
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
          {pending ? "Enregistrement…" : "Déposer"}
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
