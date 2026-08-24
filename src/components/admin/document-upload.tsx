"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Envoie un fichier dans le bucket PRIVÉ `documents` (session staff via cookies,
 * contrôlée par la RLS du bucket), puis dépose le CHEMIN de stockage - pas une
 * URL - dans des champs cachés que le formulaire soumettra. Rien n'est public :
 * l'ouverture se fait plus tard par URL signée, côté serveur.
 *
 * Diffère de `MediaUpload` (bucket public, URL publique) : ici on garde le
 * chemin, jamais d'URL directe vers une pièce patrimoniale.
 */
export function DocumentUpload({
  clientId,
  pathPrefix,
  accept = "application/pdf,image/*",
  label,
  hint,
}: {
  clientId: string;
  /** Sous-dossier optionnel sous `${clientId}/` (ex. "audits"). */
  pathPrefix?: string;
  accept?: string;
  label: string;
  hint?: string;
}) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [size, setSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_BYTES = 20 * 1024 * 1024;

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setError("Fichier trop volumineux (max 20 Mo).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    setError("");
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
    const key = `${clientId}/${pathPrefix ? `${pathPrefix}/` : ""}${crypto.randomUUID()}-${safe}`;

    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(key, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setError("Échec de l'envoi. Réessayez.");
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setPath(key);
    setName(file.name);
    setSize(file.size);
    setBusy(false);
  }

  function clear() {
    setPath("");
    setName("");
    setSize(0);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="block text-[12px] font-medium text-ink mb-1.5">{label}</label>
      <input type="hidden" name="doc_path" value={path} />
      <input type="hidden" name="doc_name" value={name} />
      <input type="hidden" name="doc_size" value={size || ""} />

      {path && (
        <div className="mb-2 flex items-center gap-3">
          <span className="text-[12.5px] text-charcoal truncate max-w-[280px]">{name}</span>
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
