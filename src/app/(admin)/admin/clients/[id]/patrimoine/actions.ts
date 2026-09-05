"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, type ActionState } from "@/lib/staff";
import { ASSET_TYPES } from "@/lib/patrimoine";

const TYPE_VALUES = ASSET_TYPES.map((t) => t.value) as [string, ...string[]];

const assetSchema = z.object({
  clientId: z.uuid(),
  type: z.enum(TYPE_VALUES, { message: "Type d'actif invalide." }),
  label: z.string().trim().min(1, "Intitulé requis.").max(120),
  value: z.coerce
    .number({ message: "Valeur invalide." })
    .nonnegative("La valeur ne peut être négative.")
    .max(1e12, "Valeur hors limite."),
});

function revalidate(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/patrimoine`);
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function updateAsset(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Actif introuvable." };

  const parsed = assetSchema.safeParse({
    clientId: formData.get("clientId"),
    type: formData.get("type"),
    label: formData.get("label"),
    value: formData.get("value"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut modifier un patrimoine." };

  const d = parsed.data;
  const { error } = await supabase
    .from("assets")
    .update({ type: d.type, label: d.label, value: d.value })
    .eq("id", id.data);

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidate(d.clientId);
  return { status: "success" };
}

export async function deleteAsset(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  if (!id.success || !clientId.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("assets").delete().eq("id", id.data);
  revalidate(clientId.data);
}

const valuationSchema = z.object({
  assetId: z.uuid(),
  clientId: z.uuid(),
  value: z.coerce.number({ message: "Valeur invalide." }).nonnegative().max(1e12),
  valued_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
});

export async function recordValuation(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = valuationSchema.safeParse({
    assetId: formData.get("assetId"),
    clientId: formData.get("clientId"),
    value: formData.get("value"),
    valued_at: formData.get("valued_at"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut valoriser un actif." };

  const d = parsed.data;
  const { error } = await supabase
    .from("asset_valuations")
    .upsert(
      { asset_id: d.assetId, value: d.value, valued_at: d.valued_at },
      { onConflict: "asset_id,valued_at" }
    );

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  // Si ce relevé est le plus récent de l'actif, il devient sa valeur courante -
  // celle que le client voit sur sa page patrimoine.
  const { data: latest } = await supabase
    .from("asset_valuations")
    .select("valued_at")
    .eq("asset_id", d.assetId)
    .order("valued_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.valued_at === d.valued_at) {
    await supabase.from("assets").update({ value: d.value }).eq("id", d.assetId);
  }

  revalidate(d.clientId);
  return { status: "success" };
}
