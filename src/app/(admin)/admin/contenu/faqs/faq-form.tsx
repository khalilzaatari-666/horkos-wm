"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import type { ContentState } from "../shared";

const initialState: ContentState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";
const area =
  "w-full px-3 py-2.5 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors leading-[1.7] resize-y";

export interface FaqInitial {
  id?: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
}

/** Une question créée est publiée d'emblée : c'est la valeur par défaut de la table. */
const EMPTY: FaqInitial = {
  question: "",
  answer: "",
  sort_order: 0,
  is_published: true,
};

export function FaqForm({
  action,
  initial = EMPTY,
  onCancel,
  onSuccess,
}: {
  action: (prev: ContentState, formData: FormData) => Promise<ContentState>;
  initial?: FaqInitial;
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
        <label htmlFor="question" className="block text-[12px] font-medium text-ink mb-1.5">
          Question
        </label>
        <input
          id="question"
          name="question"
          required
          maxLength={300}
          defaultValue={initial.question}
          placeholder="Horkos gère-t-il mon argent directement ?"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="answer" className="block text-[12px] font-medium text-ink mb-1.5">
          Réponse
        </label>
        <textarea
          id="answer"
          name="answer"
          required
          rows={5}
          maxLength={4000}
          defaultValue={initial.answer}
          className={area}
        />
      </div>

      <div className="max-w-[200px]">
        <label htmlFor="sort_order" className="block text-[12px] font-medium text-ink mb-1.5">
          Ordre d&apos;affichage
        </label>
        <input
          id="sort_order"
          name="sort_order"
          type="number"
          min={0}
          max={999}
          step={1}
          defaultValue={initial.sort_order}
          className={field}
        />
        <p className="text-[11.5px] text-warm-grey leading-[1.5] mt-1.5">
          Le plus petit s&apos;affiche en premier.
        </p>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={initial.is_published}
          className="w-4 h-4 accent-bronze cursor-pointer"
        />
        <span className="text-[13px] text-ink">Publier (visible sur la page d&apos;accueil)</span>
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
            href="/admin/contenu/faqs"
            className="h-10 px-4 inline-flex items-center text-[13px] text-warm-grey hover:text-ink transition-colors"
          >
            Annuler
          </Link>
        )}
      </div>
    </form>
  );
}
