"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { MediaUpload } from "./media-upload";

/**
 * Le PDF d'un guide et son aperçu public, tiré de sa première page : la
 * moitié haute nette, puis cette page et les suivantes floutées dans leurs pixels
 * (voir `lib/pdf-preview`). Généré dans le navigateur de l'équipe dès qu'un
 * PDF est envoyé, puis déposé dans le bucket `media` ; les URL partent avec
 * le formulaire.
 */
export function GuidePdf({
  initialPdf,
  initialPreview,
  initialBlur,
  initialPages,
}: {
  initialPdf: string;
  initialPreview: string;
  initialBlur: string;
  initialPages: string[];
}) {
  const [pdfUrl, setPdfUrl] = useState(initialPdf);
  const [preview, setPreview] = useState(initialPreview);
  const [blur, setBlur] = useState(initialBlur);
  const [pages, setPages] = useState(initialPages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generer(url: string) {
    setBusy(true);
    setError("");
    try {
      const { apercuGuide } = await import("@/lib/pdf-preview");
      const { nette, floue, suite } = await apercuGuide(url);
      const supabase = createClient();
      const id = crypto.randomUUID();
      const envoyer = async (blob: Blob, suffixe: string) => {
        const path = `guides/previews/${id}-${suffixe}.webp`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, blob, { upsert: true, cacheControl: "31536000", contentType: "image/webp" });
        if (upErr) throw upErr;
        return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      };
      const [p, b, ...rest] = await Promise.all([
        envoyer(nette, "nette"),
        envoyer(floue, "floue"),
        ...suite.map((blob, i) => envoyer(blob, `page-${i + 1}`)),
      ]);
      setPreview(p);
      setBlur(b);
      setPages(rest);
    } catch (e) {
      console.error("[aperçu guide]", e);
      setError("L'aperçu n'a pas pu être généré depuis ce PDF. Réessayez, ou envoyez un autre fichier.");
    } finally {
      setBusy(false);
    }
  }

  // PDF retiré : plus d'aperçu (le serveur l'efface aussi).
  const nette = pdfUrl ? preview : "";
  const floue = pdfUrl ? blur : "";
  const suite = pdfUrl ? pages : [];

  return (
    <div className="space-y-5">
      <MediaUpload
        name="pdf_url"
        folder="guides"
        kind="file"
        label="Fichier PDF du guide (optionnel)"
        hint="PDF, 15 Mo maximum. Les visiteurs en voient la moitié haute de la première page, puis le lisent en entier une fois identifiés."
        initialUrl={initialPdf}
        onUploaded={(url) => {
          // Un nouveau PDF : nouvel aperçu, généré tout de suite.
          setPdfUrl(url);
          if (url) generer(url);
        }}
      />

      <div>
        <p className="block text-[12px] font-medium text-ink mb-1.5">Aperçu public</p>
        <input type="hidden" name="preview_url" value={nette} />
        <input type="hidden" name="preview_blur_url" value={floue} />
        <input type="hidden" name="preview_pages" value={JSON.stringify(suite)} />

        {nette && floue ? (
          <div className="mb-2 flex items-start gap-3">
            <Image src={nette} alt="" width={96} height={40} className="h-auto w-24 rounded border border-ink/10" />
            <Image src={floue} alt="" width={64} height={90} className="h-auto w-16 rounded border border-ink/10" />
            {suite.length > 0 && (
              <span className="self-center text-[11.5px] text-warm-grey">
                + {suite.length} page{suite.length > 1 ? "s" : ""} floutée{suite.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        ) : (
          !busy && (
            <p className="text-[11.5px] text-warm-grey mb-2">
              {pdfUrl
                ? "Pas encore d'aperçu : les visiteurs verront la description du guide sous le formulaire."
                : "L'aperçu se génère depuis la première page du PDF, dès qu'il est envoyé."}
            </p>
          )
        )}

        {pdfUrl && (
          <button
            type="button"
            onClick={() => generer(pdfUrl)}
            disabled={busy}
            className="text-[12px] text-ink underline underline-offset-2 hover:text-ink/70 disabled:text-warm-grey cursor-pointer"
          >
            {busy ? "Génération de l'aperçu…" : nette ? "Régénérer l'aperçu" : "Générer l'aperçu"}
          </button>
        )}
        {error && <p className="text-[11.5px] text-red-600 mt-1">{error}</p>}
      </div>
    </div>
  );
}
