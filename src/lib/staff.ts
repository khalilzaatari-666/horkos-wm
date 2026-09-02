import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** État renvoyé par les actions du back-office (création, édition). */
export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

/**
 * Vérifie que l'appelant est bien membre de l'équipe, avec le client soumis à la
 * RLS. La base refuserait de toute façon l'écriture à un non-staff (policies
 * `is_staff()`), mais ce contrôle rend le message d'erreur lisible et fournit
 * l'id de l'utilisateur (auteur d'un article, dépositaire d'un document…).
 */
export async function requireStaff(
  supabase: SupabaseServerClient
): Promise<{ id: string; role: "admin" | "conseiller" } | null> {
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
  return { id: user.id, role: me.role };
}

/** Une écriture bloquée par une contrainte d'unicité (slug déjà pris, etc.). */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
