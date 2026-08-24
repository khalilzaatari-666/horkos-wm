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

export interface ArticleInitial {
  id?: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  cover_url: string;
  is_published: boolean;
}

const EMPTY: ArticleInitial = {
  title: "",
  slug: "",
  category: "",
  excerpt: "",
  content: "",
  cover_url: "",
  is_published: false,
};

export function ArticleForm({
  action,
  initial = EMPTY,
}: {
  action: (prev: ContentState, formData: FormData) => Promise<ContentState>;
  initial?: ArticleInitial;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  // Tant que l'utilisateur n'a pas touché au slug, il suit le titre.
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
        <p className="text-[11.5px] text-warm-grey mt-1">
          /ressources/articles/{slug || "…"}
        </p>
      </div>

      <div>
        <label htmlFor="category" className="block text-[12px] font-medium text-ink mb-1.5">
          Catégorie <span className="text-warm-grey font-normal">(optionnel)</span>
        </label>
        <input
          id="category"
          name="category"
          maxLength={60}
          defaultValue={initial.category}
          placeholder="Patrimoine, Fiscalité, Marchés…"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="excerpt" className="block text-[12px] font-medium text-ink mb-1.5">
          Extrait <span className="text-warm-grey font-normal">(résumé affiché dans la liste)</span>
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          maxLength={400}
          defaultValue={initial.excerpt}
          className={area}
        />
      </div>

      <MediaUpload
        name="cover_url"
        folder="articles"
        kind="image"
        label="Image de couverture (optionnel)"
        hint="JPG ou PNG, 5 Mo maximum. Format paysage recommandé."
        initialUrl={initial.cover_url}
      />

      <div>
        <label htmlFor="content" className="block text-[12px] font-medium text-ink mb-1.5">
          Contenu
        </label>
        <textarea
          id="content"
          name="content"
          rows={16}
          maxLength={50000}
          defaultValue={initial.content}
          className={area}
        />
        <p className="text-[11.5px] text-warm-grey mt-1">
          Texte simple. Une ligne vide sépare deux paragraphes.
        </p>
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
        <Link
          href="/admin/contenu/articles"
          className="h-10 px-4 inline-flex items-center text-[13px] text-warm-grey hover:text-ink transition-colors"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
