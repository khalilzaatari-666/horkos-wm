"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff";
import { CONTACT_STATUTS } from "./constants";

/**
 * Les messages de contact ne se modifient pas : ils s'ouvrent, se classent et se
 * suppriment. D'où trois gestes seulement.
 *
 * Le compteur « Messages non traités » du tableau de bord compte les `nouveau` :
 * sans ces actions, il ne pouvait que grossir.
 */

const statutSchema = z.object({
  id: z.uuid(),
  status: z.enum(CONTACT_STATUTS),
});

/**
 * `"layout"` et non le défaut : les compteurs de non-lus vivent dans deux
 * layouts - la barre latérale de tout le back-office et les onglets de la
 * section - et une revalidation de page seule les laisserait périmés.
 */
function revalidate() {
  revalidatePath("/admin", "layout");
}

/**
 * Marque le message lu pour toute l'équipe.
 *
 * `where read_at is null` garde le premier lecteur plutôt que le dernier : la
 * question à laquelle la pastille répond est « quelqu'un l'a-t-il vu ? », et sa
 * réponse ne change plus une fois donnée.
 */
export async function marquerContactLu(id: string): Promise<void> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return;

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return;

  await supabase
    .from("contacts")
    .update({ read_at: new Date().toISOString(), read_by: staff.id })
    .eq("id", parsed.data)
    .is("read_at", null);

  revalidate();
}

export async function setContactStatus(formData: FormData): Promise<void> {
  const parsed = statutSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase
    .from("contacts")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  revalidate();
}

export async function deleteContact(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("contacts").delete().eq("id", id.data);
  revalidate();
}
