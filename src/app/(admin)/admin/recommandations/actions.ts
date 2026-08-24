"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, type ActionState } from "@/lib/staff";
import { parseDetails } from "@/lib/recommandation-details";

const schema = z.object({
  title: z.string().trim().min(3, "Le titre est trop court.").max(160),
  category: z.string().trim().min(1, "Catégorie requise.").max(80),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  is_active: z.boolean(),
});

/** `details` arrive en JSON depuis l'éditeur ; `parseDetails` nettoie et valide. */
function readDetails(formData: FormData): Record<string, unknown> {
  const raw = formData.get("details");
  if (typeof raw !== "string" || !raw) return {};
  try {
    return parseDetails(JSON.parse(raw)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parse(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    is_active: formData.get("is_active") === "on",
  });
}

export async function createRecommendation(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parse(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut gérer le catalogue." };

  const d = parsed.data;
  const { error } = await supabase.from("recommendations").insert({
    title: d.title,
    category: d.category,
    description: d.description || null,
    details: readDetails(formData),
    is_active: d.is_active,
  });

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidatePath("/admin/recommandations");
  return { status: "success" };
}

export async function updateRecommendation(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Recommandation introuvable." };

  const parsed = parse(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut gérer le catalogue." };

  const d = parsed.data;
  const { error } = await supabase
    .from("recommendations")
    .update({
      title: d.title,
      category: d.category,
      description: d.description || null,
      details: readDetails(formData),
      is_active: d.is_active,
    })
    .eq("id", id.data);

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidatePath("/admin/recommandations");
  return { status: "success" };
}

export async function toggleRecommendationActive(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  const active = formData.get("active") === "true";
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("recommendations").update({ is_active: active }).eq("id", id.data);
  revalidatePath("/admin/recommandations");
}

/**
 * Suppression réservée aux fiches jamais proposées : une recommandation
 * rattachée à des clients est protégée par la clé étrangère, et la supprimer de
 * force effacerait l'historique. Le cas échéant, on la désactive plutôt.
 */
export async function deleteRecommendation(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  const { count } = await supabase
    .from("client_recommendations")
    .select("*", { count: "exact", head: true })
    .eq("recommendation_id", id.data);

  if (count && count > 0) {
    await supabase.from("recommendations").update({ is_active: false }).eq("id", id.data);
  } else {
    await supabase.from("recommendations").delete().eq("id", id.data);
  }
  revalidatePath("/admin/recommandations");
}
