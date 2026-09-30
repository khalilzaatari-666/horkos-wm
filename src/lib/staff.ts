import type { createClient } from "@/lib/supabase/server";
import { peutAccederAuDossier } from "@/lib/client-access";

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

/**
 * `requireStaff`, plus la règle de `client-access` : l'appelant pilote-t-il le
 * dossier de ce client ? La RLS laisse toute l'équipe écrire sur les tables du
 * dossier, et la page qui renvoie 404 n'empêche pas d'appeler l'action
 * directement : c'est ce contrôle qui tient la règle côté serveur.
 */
export async function requireDossier(
  supabase: SupabaseServerClient,
  clientId: string
): Promise<{ id: string; role: "admin" | "conseiller" } | null> {
  const staff = await requireStaff(supabase);
  if (!staff) return null;

  const { data: client } = await supabase
    .from("profiles")
    .select("advisor_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client || !peutAccederAuDossier(staff, client.advisor_id)) return null;
  return staff;
}

/** Une écriture bloquée par une contrainte d'unicité (slug déjà pris, etc.). */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
