"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireDossier, requireStaff } from "@/lib/staff";

const schema = z.object({
  id: z.uuid(),
  status: z.enum(["soumis", "en_revue", "accepte", "rejete"]),
});

/**
 * Fait avancer un dossier de cession. Un dossier déposé par un client suit la
 * règle de son dossier (un conseiller ne tranche pas pour le client d'un
 * confrère) ; celui d'un visiteur sans compte est ouvert à toute l'équipe.
 *
 * Le client lit le même statut sur « Céder un actif ».
 */
export async function setCessionStatus(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: dossier } = await supabase
    .from("asset_submissions")
    .select("client_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!dossier) return;

  const autorise = dossier.client_id
    ? await requireDossier(supabase, dossier.client_id)
    : await requireStaff(supabase);
  if (!autorise) return;

  await supabase
    .from("asset_submissions")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  revalidatePath("/admin", "layout");
  revalidatePath("/espace", "layout");
}
