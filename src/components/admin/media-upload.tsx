"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

/**
 * Envoie un fichier dans le bucket public `media` directement depuis le
 * navigateur (session staff via cookies, contrôlée par la RLS du bucket), puis
 * dépose l'URL publique dans un champ caché que le formulaire soumettra. Le
 * fichier ne transite donc jamais par une server action - pas de limite de
 * taille de corps à contourner.
 */
export function MediaUpload({
  name,
  folder,
  kind = "image",
  label,
  hint,
  initialUrl = "",
}: {
  name: string;
  folder: string;
  kind?: "image" | "file";
  label: string;
  hint?: string;
  initialUrl?: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = kind === "image" ? "image/*" : "application/pdf";
  const maxBytes = kind === "image" ? 5 * 1024 * 1024 : 15 * 1024 * 1024;

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxBytes) {
      setError(`Fichier trop volumineux (max ${kind === "image" ? "5" : "15"} Mo).`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    setError("");
    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });

    if (upErr) {
      setError("Échec de l'envoi. Vérifiez que la migration du bucket est appliquée, puis réessayez.");
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const publicUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    setUrl(publicUrl);
    setBusy(false);
  }

  function clear() {
    setUrl("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="block text-[12px] font-medium text-ink mb-1.5">{label}</label>
      <input type="hidden" name={name} value={url} />

      {url && (
        <div className="mb-2 flex items-center gap-3">
          {kind === "image" ? (
            <Image
              src={url}
              alt=""
              width={120}
              height={72}
              className="w-[120px] h-[72px] object-cover rounded-lg border border-cream-deep"
            />
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12.5px] text-bronze-dark hover:text-bronze underline underline-offset-2 transition-colors"
            >
              Voir le fichier envoyé
            </a>
          )}
          <button
            type="button"
            onClick={clear}
            className="text-[12px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
          >
            Retirer
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        disabled={busy}
        className="block w-full text-[12.5px] text-charcoal file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-cream-deep file:bg-cream file:text-charcoal file:text-[12px] file:font-medium file:cursor-pointer hover:file:border-bronze disabled:opacity-60"
      />

      {busy && <p className="text-[11.5px] text-warm-grey mt-1">Envoi en cours…</p>}
      {hint && !busy && !error && <p className="text-[11.5px] text-warm-grey mt-1">{hint}</p>}
      {error && <p className="text-[11.5px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
