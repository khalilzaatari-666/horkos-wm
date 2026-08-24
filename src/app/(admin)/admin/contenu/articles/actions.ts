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
  category: z.string().trim().max(60).optional().or(z.literal("")),
  excerpt: z.string().trim().max(400, "L'extrait est trop long.").optional().or(z.literal("")),
  content: z.string().trim().max(50000).optional().or(z.literal("")),
  cover_url: z.string().trim().url("URL de couverture invalide.").optional().or(z.literal("")),
  is_published: z.boolean(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    slug: slugify(String(formData.get("slug") ?? formData.get("title") ?? "")),
    category: formData.get("category") ?? "",
    excerpt: formData.get("excerpt") ?? "",
    content: formData.get("content") ?? "",
    cover_url: formData.get("cover_url") ?? "",
    is_published: formData.get("is_published") === "on",
  });
}

function revalidate(slug: string) {
  revalidatePath("/admin/contenu/articles");
  revalidatePath("/ressources/articles");
  revalidatePath(`/ressources/articles/${slug}`);
}

export async function createArticle(
  _previous: ContentState,
  formData: FormData
): Promise<ContentState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return { status: "error", message: "Seule l'équipe peut publier un article." };

  const d = parsed.data;
  const { error } = await supabase.from("articles").insert({
    title: d.title,
    slug: d.slug,
    category: d.category || null,
    excerpt: d.excerpt || null,
    content: d.content || null,
    cover_url: d.cover_url || null,
    is_published: d.is_published,
    author_id: staff.id,
    published_at: d.is_published ? new Date().toISOString() : null,
  });

  if (error) {
    if (isUniqueViolation(error)) {
      return { status: "error", message: "Ce slug est déjà utilisé par un autre article." };
    }
    return { status: "error", message: "Enregistrement impossible. Réessayez." };
  }

  revalidate(d.slug);
  // Pas de redirection : la création vit dans une modale, qui se ferme et
  // rafraîchit la liste sur ce succès.
  return { status: "success" };
}

export async function updateArticle(
  _previous: ContentState,
  formData: FormData
): Promise<ContentState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Article introuvable." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return { status: "error", message: "Seule l'équipe peut modifier un article." };

  const d = parsed.data;

  // On ne pose la date de publication qu'au premier passage en publié, pour ne
  // pas la réécrire à chaque enregistrement.
  const { data: current } = await supabase
    .from("articles")
    .select("published_at")
    .eq("id", id.data)
    .maybeSingle();

  const published_at =
    d.is_published && !current?.published_at
      ? new Date().toISOString()
      : (current?.published_at ?? null);

  const { error } = await supabase
    .from("articles")
    .update({
      title: d.title,
      slug: d.slug,
      category: d.category || null,
      excerpt: d.excerpt || null,
      content: d.content || null,
      cover_url: d.cover_url || null,
      is_published: d.is_published,
      published_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id.data);

  if (error) {
    if (isUniqueViolation(error)) {
      return { status: "error", message: "Ce slug est déjà utilisé par un autre article." };
    }
    return { status: "error", message: "Enregistrement impossible. Réessayez." };
  }

  revalidate(d.slug);
  redirect("/admin/contenu/articles");
}

export async function setArticlePublished(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  const publish = formData.get("publish") === "true";
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  const patch: Record<string, unknown> = { is_published: publish };
  if (publish) {
    const { data: current } = await supabase
      .from("articles")
      .select("published_at")
      .eq("id", id.data)
      .maybeSingle();
    if (!current?.published_at) patch.published_at = new Date().toISOString();
  }

  await supabase.from("articles").update(patch).eq("id", id.data);
  revalidatePath("/admin/contenu/articles");
  revalidatePath("/ressources/articles");
}

export async function deleteArticle(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from("articles").delete().eq("id", id.data);
  revalidatePath("/admin/contenu/articles");
  revalidatePath("/ressources/articles");
}
