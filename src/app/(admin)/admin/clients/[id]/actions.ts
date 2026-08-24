"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Attribue (ou retire) le conseiller référent d'un client. Réservé aux admins :
 * la policy « Admins can update all profiles » (`is_admin`) est la seule qui
 * autorise l'écriture d'un profil tiers - un conseiller serait refusé par la
 * base. On vérifie donc le rôle ici pour un message clair.
 */
export async function setClientAdvisor(formData: FormData): Promise<void> {
  const parsed = z
    .object({
      clientId: z.uuid(),
      advisorId: z.union([z.uuid(), z.literal("")]),
    })
    .safeParse({
      clientId: formData.get("clientId"),
      advisorId: formData.get("advisorId") ?? "",
    });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") return;

  await supabase
    .from("profiles")
    .update({ advisor_id: parsed.data.advisorId || null })
    .eq("id", parsed.data.clientId);

  revalidatePath(`/admin/clients/${parsed.data.clientId}`);
}
