"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { requireStaff, isUniqueViolation, type ContentState } from "../shared";

const schema = z.object({
  title: z.string().trim().min(3, "Le titre est trop court.").max(160, "Le titre est trop long."),
  slug: z
    .string()
    .trim()
    .min(3, "Le slug est trop court.")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Le slug ne peut contenir que des minuscules, chiffres et tirets."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  partner: z.string().trim().max(120).optional().or(z.literal("")),
  cover_label: z.string().trim().max(120).optional().or(z.literal("")),
  cover_url: z.string().trim().url("URL de couverture invalide.").optional().or(z.literal("")),
  pdf_url: z.string().trim().url("URL du PDF invalide.").optional().or(z.literal("")),
  is_published: z.boolean(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    slug: slugify(String(formData.get("slug") ?? formData.get("title") ?? "")),
    description: formData.get("description") ?? "",
    partner: formData.get("partner") ?? "",
    cover_label: formData.get("cover_label") ?? "",
    cover_url: formData.get("cover_url") ?? "",
    pdf_url: formData.get("pdf_url") ?? "",
    is_published: formData.get("is_published") === "on",
  });
}

function row(d: z.infer<typeof schema>) {
  return {
    title: d.title,
    slug: d.slug,
    description: d.description || null,
    partner: d.partner || null,
    cover_label: d.cover_label || null,
    cover_url: d.cover_url || null,
    pdf_url: d.pdf_url || null,
    is_published: d.is_published,
  };
}

function revalidate() {
  revalidatePath("/admin/contenu/guides");
  revalidatePath("/ressources/guides");
}

export async function createGuide(
  _previous: ContentState,
  formData: FormData
): Promise<ContentState> {
  const parsed = parse(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut publier un guide." };

  const { error } = await supabase.from("guides").insert(row(parsed.data));
  if (error) {
    if (isUniqueViolation(error))
      return { status: "error", message: "Ce slug est déjà utilisé par un autre guide." };
    return { status: "error", message: "Enregistrement impossible. Réessayez." };
  }

  revalidate();
  redirect("/admin/contenu/guides");
}

export async function updateGuide(
  _previous: ContentState,
  formData: FormData
): Promise<ContentState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Guide introuvable." };

  const parsed = parse(formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut modifier un guide." };

  const { error } = await supabase.from("guides").update(row(parsed.data)).eq("id", id.data);
  if (error) {
    if (isUniqueViolation(error))
      return { status: "error", message: "Ce slug est déjà utilisé par un autre guide." };
    return { status: "error", message: "Enregistrement impossible. Réessayez." };
  }

  revalidate();
  redirect("/admin/contenu/guides");
}

export async function setGuidePublished(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  const publish = formData.get("publish") === "true";
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("guides").update({ is_published: publish }).eq("id", id.data);
  revalidate();
}

export async function deleteGuide(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("guides").delete().eq("id", id.data);
  revalidate();
}
