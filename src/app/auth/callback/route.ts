import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { landingFor, safeRedirect, DEFAULT_LANDING } from "@/lib/landing";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // `next` arrives from the query string, so it is attacker-controlled.
  // `safeRedirect` keeps only a single-slash relative path: "//evil.com" is
  // protocol-relative and would turn this route into an open redirect.
  const requested = safeRedirect(searchParams.get("next"));

  // « /espace » n'est pas une destination choisie : c'est le défaut que le
  // formulaire public accroche à tous ses liens. La retenir comme explicite
  // déposerait un conseiller dans l'espace client. Même règle que le formulaire
  // par code, où le rôle reprend la main sur le défaut.
  const next = requested === DEFAULT_LANDING ? null : requested;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Une destination explicite l'emporte - c'est elle qui porte
      // l'invitation vers /bienvenue, ou la page qu'on visait avant de se
      // connecter. Sans elle, le rôle décide.
      if (next) return NextResponse.redirect(`${origin}${next}`);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let role: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = profile?.role ?? null;
      }

      return NextResponse.redirect(`${origin}${landingFor(role)}`);
    }
  }

  return NextResponse.redirect(`${origin}/connexion?error=auth`);
}
