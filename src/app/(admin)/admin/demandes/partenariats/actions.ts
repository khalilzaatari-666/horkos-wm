"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff";
import { PARTENAIRE_STATUTS } from "./constants";

/**
 * Une demande de partenariat se lit et se tranche ; elle ne se réécrit pas.
 * Comme pour les contacts, le compteur du tableau de bord suit les `nouveau` et
 * n'avait rien pour redescendre avant ces actions.
 */

const statutSchema = z.object({
  id: z.uuid(),
  status: z.enum(PARTENAIRE_STATUTS),
});

/** Voir `contacts/actions.ts` : les compteurs de non-lus vivent dans des layouts. */
function revalidate() {
  revalidatePath("/admin", "layout");
}

/** Marque la demande lue pour toute l'équipe, en gardant le premier lecteur. */
export async function marquerPartenaireLu(id: string): Promise<void> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return;

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return;

  await supabase
    .from("partner_submissions")
    .update({ read_at: new Date().toISOString(), read_by: staff.id })
    .eq("id", parsed.data)
    .is("read_at", null);

  revalidate();
}

export async function setPartenaireStatus(formData: FormData): Promise<void> {
  const parsed = statutSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase
    .from("partner_submissions")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  revalidate();
}

export async function deletePartenaire(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("partner_submissions").delete().eq("id", id.data);
  revalidate();
}
