"use client";

import { useActionState } from "react";
import { enregistrerCategorie } from "./actions";
import type { ContentState } from "../shared";

const initialState: ContentState = { status: "idle" };

const field =
  "h-10 px-3 text-[13.5px] bg-white border border-ink/10 rounded-lg outline-none focus:border-bronze transition-colors";

/** Une ligne nom + ordre : vide pour créer, préremplie pour renommer ou réordonner. */
export function CategorieForm({
  type,
  initial,
}: {
  type: "articles" | "guides";
  initial?: { name: string; sort_order: number };
}) {
  const [state, formAction, pending] = useActionState(enregistrerCategorie, initialState);

  return (
    <form action={formAction} className="flex-1 min-w-0">
      <input type="hidden" name="type" value={type} />
      {initial && <input type="hidden" name="ancien" value={initial.name} />}
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={initial?.name}
          placeholder="Nouvelle catégorie : Fiscalité, Transmission…"
          aria-label="Nom de la catégorie"
          className={`${field} flex-1 min-w-[200px]`}
        />
        <input
          name="sort_order"
          type="number"
          min={0}
          max={999}
          defaultValue={initial?.sort_order ?? 0}
          aria-label="Ordre d'affichage"
          title="Ordre d'affichage : les plus petits nombres d'abord"
          className={`${field} w-20 tabular-nums`}
        />
        <button
          type="submit"
          disabled={pending}
          className={
            initial
              ? "h-10 px-3 text-[12.5px] text-ink hover:text-ink/70 font-medium disabled:opacity-40 transition-colors cursor-pointer"
              : "h-10 px-5 text-[14px] font-medium bg-ink text-white rounded-[6px] hover:bg-navy disabled:opacity-40 transition-colors cursor-pointer"
          }
        >
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
      {state.status === "error" && state.message && (
        <p className="text-[12.5px] text-red-600 mt-1.5" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
