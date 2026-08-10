import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // `next` arrives from the query string, so it is attacker-controlled. Only a
  // single-slash relative path is allowed: "//evil.com" is protocol-relative
  // and would turn this route into an open redirect towards a fake login page.
  const requested = searchParams.get("next");
  const next = requested && /^\/(?!\/)/.test(requested) ? requested : "/espace";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/connexion?error=auth`);
}
