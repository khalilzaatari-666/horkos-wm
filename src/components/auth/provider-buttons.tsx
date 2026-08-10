"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "azure";

function GoogleMark() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg className="w-[17px] h-[17px]" viewBox="0 0 23 23" aria-hidden="true">
      <path d="M1 1h10v10H1z" fill="#F25022" />
      <path d="M12 1h10v10H12z" fill="#7FBA00" />
      <path d="M1 12h10v10H1z" fill="#00A4EF" />
      <path d="M12 12h10v10H12z" fill="#FFB900" />
    </svg>
  );
}

const providers: { id: Provider; label: string; mark: React.ReactNode }[] = [
  { id: "google", label: "Continuer avec Google", mark: <GoogleMark /> },
  { id: "azure", label: "Continuer avec Microsoft", mark: <MicrosoftMark /> },
];

/**
 * Both providers hand back to /auth/callback, which exchanges the code for a
 * session. `next` survives the round trip so a deep link still lands right.
 */
export function ProviderButtons({ redirectTo = "/espace" }: { redirectTo?: string }) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  async function signIn(provider: Provider) {
    setError("");
    setBusy(provider);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", redirectTo);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callback.toString(),
        // Azure needs the scopes spelled out to return an email address.
        ...(provider === "azure" ? { scopes: "openid profile email" } : {}),
      },
    });

    if (oauthError) {
      setError("Connexion impossible pour le moment. Essayez le code par email.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2.5">
      {providers.map(({ id, label, mark }) => (
        <button
          key={id}
          type="button"
          onClick={() => signIn(id)}
          disabled={busy !== null}
          className="w-full h-11 flex items-center justify-center gap-2.5 px-4 text-[13.5px] font-medium text-ink bg-white border border-cream-deep rounded-lg hover:border-bronze/50 hover:bg-cream/60 disabled:opacity-60 transition-colors cursor-pointer"
        >
          {mark}
          {busy === id ? "Redirection..." : label}
        </button>
      ))}
      {error && <p className="text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
