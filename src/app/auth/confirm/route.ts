import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/landing";

/**
 * Vérifie un lien email à `token_hash` (mot de passe à définir, invitation),
 * contrairement à /auth/callback qui échange un `code` PKCE. La différence est
 * décisive : `verifyOtp` ne réclame aucun `code_verifier` déposé dans le
 * navigateur d'origine, donc le lien fonctionne sur n'importe quel appareil -
 * ce que le flux PKCE ne permet pas pour un lien généré par un tiers (un admin
 * qui promeut quelqu'un).
 */
const ALLOWED: EmailOtpType[] = ["recovery", "invite", "email", "signup", "magiclink"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirect(searchParams.get("next")) ?? "/bienvenue";

  if (tokenHash && type && ALLOWED.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/connexion?error=auth`);
}
