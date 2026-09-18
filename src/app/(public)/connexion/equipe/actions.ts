"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { mfaExigee, urlMfa } from "@/lib/mfa";
import { destinationAdmin } from "@/lib/landing";
import { EMAIL_MAX } from "@/lib/validation";

export interface ConnexionEquipeState {
  status: "idle" | "error";
  message?: string;
}

const schema = z.object({
  email: z.email().max(EMAIL_MAX),
  password: z.string().min(1).max(128),
  redirect: z.string().max(500).optional(),
});

/**
 * Connexion par mot de passe de l'équipe, exécutée côté serveur.
 *
 * Le navigateur ne parle plus directement à Supabase Auth : c'est ce qui permet
 * de limiter les tentatives par IP (circulaire AMMC 01/20, 5 par minute). La
 * vérification arrive avant tout appel à Supabase - une IP bloquée ne coûte
 * rien de plus qu'une lecture en base.
 */
export async function seConnecterEquipe(
  _previous: ConnexionEquipeState,
  formData: FormData
): Promise<ConnexionEquipeState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirect: formData.get("redirect") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Email ou mot de passe incorrect." };
  }

  if (!(await rateLimit("login", { max: 5, windowSeconds: 60 }))) {
    return {
      status: "error",
      message: "Trop de tentatives. Patientez une minute avant de réessayer.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { status: "error", message: "Email ou mot de passe incorrect." };
  }

  // Un compte client qui se trompe de formulaire serait sinon renvoyé vers son
  // espace par le proxy, sans un mot d'explication.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const staff = profile?.role === "admin" || profile?.role === "conseiller";
  if (!staff) redirect("/espace");

  const destination = destinationAdmin(parsed.data.redirect);

  // Second facteur exigé (voir `@/lib/mfa`) : la page MFA vérifie le code, ou
  // inscrit le facteur s'il n'existe pas encore, puis renvoie vers la
  // destination. Le proxy y renverrait de toute façon ; autant y aller droit.
  redirect(mfaExigee() ? urlMfa(destination) : destination);
}
