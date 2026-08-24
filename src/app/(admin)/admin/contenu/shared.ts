import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** État renvoyé par toutes les actions de contenu (création, édition). */
export interface ContentState {
  status: "idle" | "success" | "error";
  message?: string;
}

/**
 * Vérifie que l'appelant est bien membre de l'équipe, avec le client soumis à la
 * RLS. La base refuserait de toute façon l'écriture à un non-staff (policies
 * `is_staff()`), mais ce contrôle rend le message d'erreur lisible et fournit
 * l'id de l'auteur pour les articles.
 */
export async function requireStaff(
  supabase: SupabaseServerClient
): Promise<{ id: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin" && me?.role !== "conseiller") return null;
  return { id: user.id };
}

/** Une écriture bloquée par la contrainte d'unicité (slug déjà pris). */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
