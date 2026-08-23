"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Minimum volontairement au-dessus des 6 caractères de Supabase : ce compte ouvre le back-office. */
const MIN_LENGTH = 10;

const inputClass =
  "w-full h-11 px-3.5 pr-11 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

/**
 * Définition du mot de passe à la première connexion d'un membre de l'équipe.
 *
 * La session existe déjà : le lien d'invitation est passé par `/auth/callback`,
 * qui a échangé le code. Il ne reste qu'à poser le mot de passe, puis à filer
 * au back-office.
 */
export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = password.length >= MIN_LENGTH && confirm === password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(
        "Le mot de passe n'a pas pu être enregistré. Le lien d'invitation a peut-être expiré - demandez-en un nouveau."
      );
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-[12.5px] font-medium text-ink mb-1.5">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            type={show ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-grey hover:text-ink transition-colors cursor-pointer"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className={`text-[12px] mt-1.5 ${tooShort ? "text-red-600" : "text-warm-grey"}`}>
          {MIN_LENGTH} caractères minimum.
        </p>
      </div>

      <div>
        <label htmlFor="confirm" className="block text-[12.5px] font-medium text-ink mb-1.5">
          Confirmer le mot de passe
        </label>
        <input
          id="confirm"
          type={show ? "text" : "password"}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />
        {mismatch && (
          <p className="text-[12px] text-red-600 mt-1.5">Les deux saisies ne correspondent pas.</p>
        )}
      </div>

      {error && <p className="text-[13px] text-red-600 leading-[1.5]">{error}</p>}

      <button
        type="submit"
        disabled={!valid || loading}
        className="w-full px-6 py-3 text-[13.5px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {loading ? "Enregistrement…" : "Définir mon mot de passe"}
      </button>
    </form>
  );
}
