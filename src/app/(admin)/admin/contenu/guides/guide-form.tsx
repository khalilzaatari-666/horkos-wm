"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MediaUpload } from "@/components/admin/media-upload";
import { slugify } from "@/lib/slug";
import type { ContentState } from "../shared";

const initialState: ContentState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";
const area =
  "w-full px-3 py-2.5 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors leading-[1.7] resize-y";

export interface GuideInitial {
  id?: string;
  title: string;
  slug: string;
  description: string;
  partner: string;
  cover_label: string;
  cover_url: string;
  pdf_url: string;
  is_published: boolean;
}

const EMPTY: GuideInitial = {
  title: "",
  slug: "",
  description: "",
  partner: "",
  cover_label: "",
  cover_url: "",
  pdf_url: "",
  is_published: false,
};

export function GuideForm({
  action,
  initial = EMPTY,
}: {
  action: (prev: ContentState, formData: FormData) => Promise<ContentState>;
  initial?: GuideInitial;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugLocked, setSlugLocked] = useState(Boolean(initial.slug));

  return (
    <form action={formAction} className="max-w-[760px] space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label htmlFor="title" className="block text-[12px] font-medium text-ink mb-1.5">
          Titre
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={160}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugLocked) setSlug(slugify(e.target.value));
          }}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-[12px] font-medium text-ink mb-1.5">
          Slug <span className="text-warm-grey font-normal">(dans l&apos;URL)</span>
        </label>
        <input
          id="slug"
          name="slug"
          required
          maxLength={80}
          value={slug}
          onChange={(e) => {
            setSlugLocked(true);
            setSlug(slugify(e.target.value));
          }}
          className={`${field} font-mono text-[12.5px]`}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-[12px] font-medium text-ink mb-1.5">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={initial.description}
          className={area}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="partner" className="block text-[12px] font-medium text-ink mb-1.5">
            Partenaire <span className="text-warm-grey font-normal">(optionnel)</span>
          </label>
          <input
            id="partner"
            name="partner"
            maxLength={120}
            defaultValue={initial.partner}
            placeholder="En partenariat avec…"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="cover_label" className="block text-[12px] font-medium text-ink mb-1.5">
            Texte de couverture <span className="text-warm-grey font-normal">(optionnel)</span>
          </label>
          <input
            id="cover_label"
            name="cover_label"
            maxLength={120}
            defaultValue={initial.cover_label}
            placeholder="À défaut, le titre est utilisé"
            className={field}
          />
        </div>
      </div>

      <MediaUpload
        name="cover_url"
        folder="guides"
        kind="image"
        label="Image de couverture (optionnel)"
        hint="JPG ou PNG, 5 Mo maximum."
        initialUrl={initial.cover_url}
      />

      <MediaUpload
        name="pdf_url"
        folder="guides"
        kind="file"
        label="Fichier PDF du guide (optionnel)"
        hint="PDF, 15 Mo maximum. C'est le fichier envoyé aux personnes qui le demandent."
        initialUrl={initial.pdf_url}
      />

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
        <Link
          href="/admin/contenu/guides"
          className="h-10 px-4 inline-flex items-center text-[13px] text-warm-grey hover:text-ink transition-colors"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
