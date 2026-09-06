"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, type ContentState } from "../shared";

const schema = z.object({
  question: z
    .string()
    .trim()
    .min(5, "La question est trop courte.")
    .max(300, "La question est trop longue."),
  answer: z
    .string()
    .trim()
    .min(5, "La réponse est trop courte.")
    .max(4000, "La réponse est trop longue."),
  // L'ordre est saisi à la main plutôt que glissé : la liste tient en une
  // poignée d'entrées, et un nombre se relit sans ambiguïté.
  sort_order: z.coerce
    .number()
    .int("L'ordre doit être un nombre entier.")
    .min(0, "L'ordre ne peut pas être négatif.")
    .max(999, "L'ordre est trop grand."),
  is_published: z.boolean(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
    sort_order: formData.get("sort_order") || 0,
    is_published: formData.get("is_published") === "on",
  });
}

/**
 * La FAQ vit sur la page d'accueil, qui est régénérée périodiquement : on
 * l'invalide explicitement pour qu'une correction ne mette pas cinq minutes à
 * se voir.
 */
function revalidate() {
  revalidatePath("/admin/contenu/faqs");
  revalidatePath("/");
}

export async function createFaq(
  _previous: ContentState,
  formData: FormData
): Promise<ContentState> {
  const parsed = parse(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut publier une question." };

  const d = parsed.data;
  const { error } = await supabase.from("faqs").insert({
    question: d.question,
    answer: d.answer,
    sort_order: d.sort_order,
    is_published: d.is_published,
  });

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidate();
  // La création se fait en modale : elle se ferme et rafraîchit sur ce succès.
  return { status: "success" };
}

export async function updateFaq(
  _previous: ContentState,
  formData: FormData
): Promise<ContentState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Question introuvable." };

  const parsed = parse(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut modifier une question." };

  const d = parsed.data;
  const { error } = await supabase
    .from("faqs")
    .update({
      question: d.question,
      answer: d.answer,
      sort_order: d.sort_order,
      is_published: d.is_published,
    })
    .eq("id", id.data);

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidate();
  redirect("/admin/contenu/faqs");
}

export async function setFaqPublished(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  const publish = formData.get("publish") === "true";
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("faqs").update({ is_published: publish }).eq("id", id.data);
  revalidate();
}

export async function deleteFaq(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("faqs").delete().eq("id", id.data);
  revalidate();
}
