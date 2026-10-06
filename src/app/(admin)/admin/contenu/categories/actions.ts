"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, isUniqueViolation, type ContentState } from "../shared";

/** Chaque page a sa propre liste : une table par type de contenu. */
const TABLES = { articles: "article_categories", guides: "guide_categories" } as const;
const type = z.enum(["articles", "guides"]);
const nom = z.string().trim().min(1, "Donnez un nom à la catégorie.").max(60, "60 caractères maximum.");

/** Une catégorie touche les listes du back-office et les pages Ressources. */
function revalidate() {
  revalidatePath("/admin/contenu", "layout");
  revalidatePath("/ressources", "layout");
}

/**
 * Crée une catégorie, ou la modifie quand `ancien` est fourni. Renommer suffit :
 * la base répercute le nouveau nom sur les contenus rangés dedans.
 */
export async function enregistrerCategorie(
  _previous: ContentState,
  formData: FormData
): Promise<ContentState> {
  const parsed = z
    .object({
      type,
      ancien: nom.optional(),
      name: nom,
      sort_order: z.coerce.number().int("L'ordre est un nombre entier.").min(0).max(999),
    })
    .safeParse({
      type: formData.get("type"),
      ancien: formData.get("ancien") || undefined,
      name: formData.get("name"),
      sort_order: formData.get("sort_order") || 0,
    });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut gérer les catégories." };

  const { ancien, name, sort_order } = parsed.data;
  const table = supabase.from(TABLES[parsed.data.type]);
  const { error } = ancien
    ? await table.update({ name, sort_order }).eq("name", ancien)
    : await table.insert({ name, sort_order });

  if (error) {
    return {
      status: "error",
      message: isUniqueViolation(error)
        ? "Cette catégorie existe déjà."
        : "Enregistrement impossible. Réessayez.",
    };
  }

  revalidate();
  return { status: "success" };
}

/** Ses contenus restent en ligne, simplement sans catégorie. */
export async function supprimerCategorie(formData: FormData): Promise<void> {
  const parsed = z
    .object({ type, name: nom })
    .safeParse({ type: formData.get("type"), name: formData.get("name") });
  if (!parsed.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase.from(TABLES[parsed.data.type]).delete().eq("name", parsed.data.name);
  revalidate();
}
