import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { aUneSessionProbable, estArriveeDirecte, espaceDuRole } from "@/lib/accueil";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // L'accueil aiguille selon le rôle, mais seulement pour une adresse saisie :
  // le lien « Retour au site » des deux espaces pointe sur `/` et doit continuer
  // d'y mener. Voir `@/lib/accueil` pour la règle et ses raisons.
  //
  // Le raccourci du cookie est ce qui garde la page d'accueil gratuite : sans
  // session, on rend le site public sans un seul aller-retour vers Supabase.
  const accueil = pathname === "/";
  if (accueil) {
    const direct = estArriveeDirecte(
      request.headers.get("sec-fetch-site"),
      request.headers.get("sec-fetch-dest")
    );
    const connecte = aUneSessionProbable(request.cookies.getAll().map((c) => c.name));
    if (!direct || !connecte) return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (accueil) {
    // Le cookie pouvait être périmé : sans utilisateur, le site public reste
    // la bonne réponse.
    if (!user) return supabaseResponse;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const url = request.nextUrl.clone();
    url.pathname = espaceDuRole(profile?.role);
    return NextResponse.redirect(url);
  }

  // Protected routes: /espace/* requires auth
  if (pathname.startsWith("/espace") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Protected routes: /admin/* requires admin or conseiller role.
  // Staff sign in with a password, so send them to their own page.
  if (pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion/equipe";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "conseiller")) {
      const url = request.nextUrl.clone();
      url.pathname = "/espace";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
