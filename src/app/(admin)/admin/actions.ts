"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff";

/**
 * Change la photo d'un membre de l'équipe.
 *
 * Chacun la sienne, l'admin celle de tout le monde : c'est exactement ce que
 * disent déjà les policies « Users can update own profile » et « Admins can
 * update all profiles ». Le contrôle est refait ici pour rendre un refus lisible
 * plutôt qu'une écriture silencieusement sans effet.
 *
 * `url` vide efface la photo - on retombe alors sur les initiales.
 */
export async function setAvatar(formData: FormData): Promise<void> {
  const parsed = z
    .object({
      userId: z.uuid(),
      url: z.union([z.url(), z.literal("")]),
    })
    .safeParse({
      userId: formData.get("userId"),
      url: formData.get("url") ?? "",
    });
  if (!parsed.success) return;

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return;

  if (staff.id !== parsed.data.userId && staff.role !== "admin") return;

  await supabase
    .from("profiles")
    .update({ avatar_url: parsed.data.url || null })
    .eq("id", parsed.data.userId);

  revalidatePath("/admin/mon-profil");
  revalidatePath("/admin/utilisateurs");
  // Le client voit cette photo sur son tableau de bord.
  revalidatePath("/espace");
}

/**
 * Le téléphone qu'un client lira sur la fiche de son conseiller.
 *
 * Même règle que la photo - le sien, ou n'importe lequel pour un admin - parce
 * que c'est la même donnée de fiche, et qu'elle doit pouvoir être corrigée sans
 * attendre son titulaire.
 */
export async function setPhone(formData: FormData): Promise<void> {
  const parsed = z
    .object({ userId: z.uuid(), phone: z.string().trim().max(40) })
    .safeParse({ userId: formData.get("userId"), phone: formData.get("phone") ?? "" });
  if (!parsed.success) return;

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return;

  if (staff.id !== parsed.data.userId && staff.role !== "admin") return;

  await supabase
    .from("profiles")
    .update({ phone: parsed.data.phone || null })
    .eq("id", parsed.data.userId);

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/espace");
}

/**
 * Clôt une demande d'échange depuis le tableau de bord.
 *
 * Qui l'a traitée et quand sont conservés : c'est la seule façon de savoir, plus
 * tard, qu'une demande a bien été reprise par quelqu'un.
 */
export async function marquerDemandeTraitee(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return;

  await supabase
    .from("advisor_requests")
    .update({
      status: "traite",
      handled_at: new Date().toISOString(),
      handled_by: staff.id,
    })
    .eq("id", id.data);

  revalidatePath("/admin");
}
