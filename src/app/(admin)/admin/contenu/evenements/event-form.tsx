"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import type { ContentState } from "../shared";

const initialState: ContentState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";
const area =
  "w-full px-3 py-2.5 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors leading-[1.7] resize-y";

export interface EventInitial {
  id?: string;
  title: string;
  description: string;
  location: string;
  /** ISO stocké ; réduit à « AAAA-MM-JJThh:mm » pour le champ datetime-local. */
  date: string;
  is_published: boolean;
}

const EMPTY: EventInitial = {
  title: "",
  description: "",
  location: "",
  date: "",
  is_published: false,
};

/** ISO UTC -> valeur d'un champ datetime-local (mêmes composantes, sans dérive). */
function toLocalInput(iso: string): string {
  return iso ? iso.slice(0, 16) : "";
}

export function EventForm({
  action,
  initial = EMPTY,
  onCancel,
  onSuccess,
}: {
  action: (prev: ContentState, formData: FormData) => Promise<ContentState>;
  initial?: EventInitial;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success") onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="max-w-[760px] space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label htmlFor="title" className="block text-[12px] font-medium text-ink mb-1.5">
          Titre
        </label>
        <input id="title" name="title" required maxLength={160} defaultValue={initial.title} className={field} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-[12px] font-medium text-ink mb-1.5">
            Date et heure
          </label>
          <input
            id="date"
            name="date"
            type="datetime-local"
            required
            defaultValue={toLocalInput(initial.date)}
            className={`${field} cursor-pointer`}
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-[12px] font-medium text-ink mb-1.5">
            Lieu <span className="text-warm-grey font-normal">(optionnel)</span>
          </label>
          <input
            id="location"
            name="location"
            maxLength={160}
            defaultValue={initial.location}
            placeholder="Casablanca, en ligne…"
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-[12px] font-medium text-ink mb-1.5">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={4000}
          defaultValue={initial.description}
          className={area}
        />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={initial.is_published}
          className="w-4 h-4 accent-bronze cursor-pointer"
        />
        <span className="text-[13px] text-ink">Publier (visible sur le site public)</span>
      </label>

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
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 inline-flex items-center text-[13px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
          >
            Annuler
          </button>
        ) : (
          <Link
            href="/admin/contenu/evenements"
            className="h-10 px-4 inline-flex items-center text-[13px] text-warm-grey hover:text-ink transition-colors"
          >
            Annuler
          </Link>
        )}
      </div>
    </form>
  );
}
