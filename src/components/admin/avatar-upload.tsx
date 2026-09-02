"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setAvatar } from "@/app/(admin)/admin/actions";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Photo d'un membre de l'équipe : la vignette elle-même ouvre le sélecteur.
 *
 * L'envoi part du navigateur vers le bucket public `media` (session staff,
 * RLS du bucket), puis une server action inscrit l'URL sur le profil. Le
 * fichier ne traverse donc aucune action - seule l'URL, courte, y passe.
 *
 * Sans photo, les initiales tiennent la place : c'est déjà ce que fait la barre
 * latérale, et un client voit ainsi toujours quelque chose.
 */
export function AvatarUpload({
  userId,
  url,
  initials,
  size = 64,
  editable = true,
  compact = false,
}: {
  userId: string;
  url: string | null;
  initials: string;
  size?: number;
  editable?: boolean;
  /** Vignette seule, sans texte à côté - pour la barre latérale. */
  compact?: boolean;
}) {
  const [preview, setPreview] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save(next: string) {
    const data = new FormData();
    data.set("userId", userId);
    data.set("url", next);
    startTransition(async () => {
      await setAvatar(data);
      router.refresh();
    });
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setError("Image trop lourde (max 5 Mo).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setError("");
    setBusy(true);
    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `conseillers/${userId}-${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";

    if (upErr) {
      setError("Échec de l'envoi. Réessayez.");
      return;
    }

    const publicUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    setPreview(publicUrl);
    save(publicUrl);
  }

  const vignette = preview ? (
    <Image
      src={preview}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="rounded-full object-cover border border-cream-deep"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className="grid place-items-center rounded-full bg-ink text-cream font-heading font-semibold border border-cream-deep"
      style={{ width: size, height: size, fontSize: Math.round(size / 2.8) }}
    >
      {initials}
    </span>
  );

  if (!editable) return vignette;

  const champ = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      onChange={onChange}
      disabled={busy || pending}
      className="sr-only"
      aria-label="Changer la photo"
    />
  );

  if (compact) {
    return (
      <label
        className={`relative shrink-0 cursor-pointer rounded-full ring-offset-2 ring-offset-ink transition-shadow hover:ring-2 hover:ring-bronze ${
          busy || pending ? "opacity-60" : ""
        } ${error ? "ring-2 ring-red-400" : ""}`}
        title={error || (busy || pending ? "Envoi…" : "Changer ma photo")}
      >
        {vignette}
        {champ}
      </label>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <label
        className={`relative shrink-0 cursor-pointer ${busy || pending ? "opacity-60" : ""}`}
        title="Changer la photo"
      >
        {vignette}
        {champ}
      </label>

      <div className="min-w-0">
        {busy || pending ? (
          <p className="text-[11.5px] text-warm-grey">Envoi…</p>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="text-[11.5px] text-warm-grey">
              {preview ? "Photo enregistrée" : "Aucune photo"}
            </span>
            {preview && (
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  save("");
                }}
                className="text-[11.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
              >
                Retirer
              </button>
            )}
          </div>
        )}
        {error && <p className="text-[11.5px] text-red-600">{error}</p>}
      </div>
    </div>
  );
}
