"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, type ContentState } from "../shared";

const schema = z.object({
  title: z.string().trim().min(3, "Le titre est trop court.").max(160, "Le titre est trop long."),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  date: z.string().min(1, "Indiquez une date et une heure."),
  is_published: z.boolean(),
});

/**
 * Le champ `datetime-local` fournit « AAAA-MM-JJThh:mm » sans fuseau. On le fige
 * en UTC (suffixe Z) : le rendu public, lui aussi en UTC côté serveur, réaffiche
 * exactement l'heure saisie, sans dérive de fuseau entre saisie et affichage.
 */
function toIso(local: string): string | null {
  const norm = local.trim().slice(0, 16);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(norm)) return null;
  const d = new Date(`${norm}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parse(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    location: formData.get("location") ?? "",
    date: formData.get("date") ?? "",
    is_published: formData.get("is_published") === "on",
  });
}

function revalidate() {
  revalidatePath("/admin/contenu/evenements");
  revalidatePath("/ressources/evenements");
}

export async function createEvent(
  _previous: ContentState,
  formData: FormData
): Promise<ContentState> {
  const parsed = parse(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const iso = toIso(parsed.data.date);
  if (!iso) return { status: "error", message: "Date et heure invalides." };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut publier un événement." };

  const d = parsed.data;
  const { error } = await supabase.from("events").insert({
    title: d.title,
    description: d.description || null,
    location: d.location || null,
    date: iso,
    is_published: d.is_published,
  });

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidate();
  // La création se fait en modale : elle se ferme et rafraîchit sur ce succès.
  return { status: "success" };
}

export async function updateEvent(
  _previous: ContentState,
  formData: FormData
): Promise<ContentState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Événement introuvable." };

  const parsed = parse(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const iso = toIso(parsed.data.date);
  if (!iso) return { status: "error", message: "Date et heure invalides." };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut modifier un événement." };

  const d = parsed.data;
  const { error } = await supabase
    .from("events")
    .update({
      title: d.title,
      description: d.description || null,
      location: d.location || null,
      date: iso,
      is_published: d.is_published,
    })
    .eq("id", id.data);

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidate();
  redirect("/admin/contenu/evenements");
}

export async function setEventPublished(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  const publish = formData.get("publish") === "true";
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("events").update({ is_published: publish }).eq("id", id.data);
  revalidate();
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("events").delete().eq("id", id.data);
  revalidate();
}
