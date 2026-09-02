"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENT_ACCEPT, fileExtensionLabel } from "@/lib/documents";

/**
 * Plusieurs fichiers pour une même fiche - photos d'un produit, brochures d'un
 * contrat.
 *
 * Même mécanique que `MediaUpload` : l'envoi part du navigateur vers le bucket
 * public `media`, la session staff faisant foi via la RLS du bucket. Le fichier
 * ne traverse donc aucune server action, et la limite de taille de corps de
 * Next ne s'applique pas. La différence tient à la sortie : une liste tenue par
 * l'appelant plutôt qu'un champ caché, parce que le formulaire des
 * recommandations sérialise lui-même tout `details` en JSON.
 */
export interface MediaItem {
  url: string;
  /** Légende d'une photo, ou intitulé d'un document. */
  label: string;
}

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_FILE = 15 * 1024 * 1024;

export function MediaListUpload({
  kind,
  items,
  setItems,
  folder,
  labelPlaceholder,
  addLabel,
  hint,
}: {
  kind: "image" | "file";
  items: MediaItem[];
  setItems: (v: MediaItem[]) => void;
  /** Dossier du bucket, ex. « recommandations/photos ». */
  folder: string;
  labelPlaceholder: string;
  addLabel: string;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = kind === "image";
  const maxBytes = isImage ? MAX_IMAGE : MAX_FILE;

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setError("");
    setBusy(true);
    const supabase = createClient();
    const ajouts: MediaItem[] = [];
    const refuses: string[] = [];

    // Séquentiel plutôt qu'en parallèle : une sélection de dix photos ne doit
    // pas ouvrir dix connexions d'un coup, et l'ordre choisi est conservé.
    for (const file of files) {
      if (file.size > maxBytes) {
        refuses.push(file.name);
        continue;
      }

      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });

      if (upErr) {
        refuses.push(file.name);
        continue;
      }

      ajouts.push({
        url: supabase.storage.from("media").getPublicUrl(path).data.publicUrl,
        // Le nom du fichier, sans extension, fait un intitulé de départ
        // acceptable - toujours mieux qu'un champ vide à remplir.
        label: file.name.replace(/\.[^.]+$/, ""),
      });
    }

    if (ajouts.length) setItems([...items, ...ajouts]);
    if (refuses.length) {
      setError(
        `Non envoyé${refuses.length > 1 ? "s" : ""} : ${refuses.join(", ")} (max ${
          isImage ? "5" : "15"
        } Mo, ou envoi refusé).`
      );
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function update(i: number, label: string) {
    setItems(items.map((it, j) => (j === i ? { ...it, label } : it)));
  }

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.url} className="flex gap-2.5 items-center">
          {isImage ? (
            <Image
              src={it.url}
              alt=""
              width={64}
              height={44}
              unoptimized
              className="w-16 h-11 object-cover rounded-lg border border-cream-deep shrink-0"
            />
          ) : (
            <a
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-bronze-dark hover:text-bronze border border-cream-deep rounded px-1.5 py-1 shrink-0 w-[52px] text-center"
            >
              {fileExtensionLabel(it.url)}
            </a>
          )}
          <input
            value={it.label}
            onChange={(e) => update(i, e.target.value)}
            placeholder={labelPlaceholder}
            className="flex-1 h-9 px-2.5 text-[13px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors"
          />
          <button
            type="button"
            onClick={() => setItems(items.filter((_, j) => j !== i))}
            className="text-[16px] text-warm-grey hover:text-red-600 cursor-pointer"
            aria-label="Retirer"
          >
            ×
          </button>
        </div>
      ))}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={isImage ? "image/*" : DOCUMENT_ACCEPT}
        onChange={onChange}
        disabled={busy}
        aria-label={addLabel}
        className="block w-full text-[12.5px] text-charcoal file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-cream-deep file:bg-cream file:text-charcoal file:text-[12px] file:font-medium file:cursor-pointer hover:file:border-bronze disabled:opacity-60"
      />

      {busy && <p className="text-[11.5px] text-warm-grey">Envoi en cours…</p>}
      {hint && !busy && !error && <p className="text-[11.5px] text-warm-grey">{hint}</p>}
      {error && <p className="text-[11.5px] text-red-600">{error}</p>}
    </div>
  );
}
