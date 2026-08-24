"use client";

import { useActionState, useEffect } from "react";
import { ASSET_TYPES } from "@/lib/patrimoine";
import type { ActionState } from "@/lib/staff";

const initialState: ActionState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

export interface AssetInitial {
  id?: string;
  type: string;
  label: string;
  value: number;
}

export function AssetForm({
  clientId,
  action,
  initial,
  onCancel,
  onSuccess,
}: {
  clientId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: AssetInitial;
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
        <label htmlFor="type" className="block text-[12px] font-medium text-ink mb-1.5">
          Type d&apos;actif
        </label>
        <select
          id="type"
          name="type"
          defaultValue={initial?.type ?? ASSET_TYPES[0].value}
          className={`${field} cursor-pointer`}
        >
          {ASSET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="label" className="block text-[12px] font-medium text-ink mb-1.5">
          Intitulé
        </label>
        <input
          id="label"
          name="label"
          required
          maxLength={120}
          defaultValue={initial?.label}
          placeholder="Appartement Casablanca, Contrat AV Generali…"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="value" className="block text-[12px] font-medium text-ink mb-1.5">
          Valeur actuelle (MAD)
        </label>
        <input
          id="value"
          name="value"
          type="number"
          min="0"
          step="1"
          required
          defaultValue={initial?.value ?? ""}
          className={`${field} tabular-nums`}
        />
        {!initial?.id && (
          <p className="text-[11.5px] text-warm-grey mt-1">
            Un premier relevé daté d&apos;aujourd&apos;hui est enregistré automatiquement.
          </p>
        )}
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
