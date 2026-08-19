"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEMANDE_STATUTS } from "./constants";

const schema = z.object({
  id: z.uuid(),
  status: z.enum(DEMANDE_STATUTS),
});

/**
 * Change le statut d'une demande de rendez-vous.
 *
 * Aucun contrôle de rôle explicite ici : la policy « Staff update appointment
 * requests » ne laisse passer que `is_staff()`. Un client qui forgerait l'appel
 * verrait sa mise à jour ignorée par Postgres, pas par une condition qu'on
 * pourrait oublier de réécrire.
 */
export async function updateDemandeStatus(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  // Comme pour les rôles : une écriture bloquée par la RLS ne lève pas
  // d'erreur, elle touche zéro ligne. On lit ce qui a été modifié pour que
  // l'échec laisse une trace au lieu de passer pour un succès.
  const { data: updated, error } = await supabase
    .from("appointment_requests")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id");

  if (error || !updated || updated.length === 0) {
    console.error(
      "[admin] statut de demande non mis à jour:",
      error ?? "aucune ligne modifiée (RLS ?)"
    );
    return;
  }

  revalidatePath("/admin/demandes");
  revalidatePath("/admin");
}
