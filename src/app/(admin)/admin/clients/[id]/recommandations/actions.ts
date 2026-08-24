"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, type ActionState } from "@/lib/staff";

const STATUS = ["proposee", "acceptee", "rejetee", "mise_en_place"] as const;

function revalidate(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/recommandations`);
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function assignRecommendation(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = z
    .object({
      clientId: z.uuid(),
      recommendationId: z.uuid("Choisissez une recommandation."),
      notes: z.string().trim().max(2000).optional().or(z.literal("")),
    })
    .safeParse({
      clientId: formData.get("clientId"),
      recommendationId: formData.get("recommendationId"),
      notes: formData.get("notes") ?? "",
    });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return { status: "error", message: "Seule l'équipe peut proposer une recommandation." };

  const d = parsed.data;
  const { error } = await supabase.from("client_recommendations").insert({
    client_id: d.clientId,
    recommendation_id: d.recommendationId,
    status: "proposee",
    advisor_id: staff.id,
    notes: d.notes || null,
  });

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidate(d.clientId);
  return { status: "success" };
}

export async function updateAssignment(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = z
    .object({
      id: z.uuid(),
      clientId: z.uuid(),
      status: z.enum(STATUS),
      notes: z.string().trim().max(2000).optional().or(z.literal("")),
    })
    .safeParse({
      id: formData.get("id"),
      clientId: formData.get("clientId"),
      status: formData.get("status"),
      notes: formData.get("notes") ?? "",
    });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut modifier une recommandation." };

  const d = parsed.data;
  const { error } = await supabase
    .from("client_recommendations")
    .update({ status: d.status, notes: d.notes || null })
    .eq("id", d.id);

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidate(d.clientId);
  return { status: "success" };
}

export async function removeAssignment(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  if (!id.success || !clientId.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("client_recommendations").delete().eq("id", id.data);
  revalidate(clientId.data);
}
