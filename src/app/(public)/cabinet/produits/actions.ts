"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendAssetSubmissionNotification } from "@/lib/email/asset-submission";
import {
  assetTypeOptions,
  cessionReasonOptions,
  ESTIMATED_VALUE_MAX,
  DESCRIPTION_MAX,
  HORIZON_MAX,
} from "@/lib/asset-options";
import {
  NAME_MAX,
  EMAIL_MAX,
  validatePhoneFull,
} from "@/lib/validation";

export interface AssetState {
  status: "idle" | "success" | "error";
  message?: string;
}

const schema = z.object({
  assetType: z.enum(assetTypeOptions, { message: "Sélectionnez un type d'actif." }),
  reason: z.enum(cessionReasonOptions, { message: "Sélectionnez un motif." }),
  // Companies submit too, so digits and punctuation are allowed here even
  // though the pure name fields elsewhere are letters-only.
  contactName: z
    .string()
    .trim()
    .min(2, "Le nom est trop court.")
    .max(NAME_MAX + 60),
  contactEmail: z.email("Veuillez entrer une adresse email valide.").max(EMAIL_MAX),
  contactPhone: z
    .string()
    .trim()
    .refine((v) => validatePhoneFull(v) === null, "Numéro de téléphone invalide."),
  estimatedValue: z.coerce
    .number({ message: "Indiquez une valeur estimée." })
    .positive("La valeur doit être supérieure à zéro.")
    .max(ESTIMATED_VALUE_MAX, "Cette valeur semble erronée."),
  horizon: z.string().trim().max(HORIZON_MAX).optional().or(z.literal("")),
  description: z.string().trim().max(DESCRIPTION_MAX).optional().or(z.literal("")),
});

export async function submitAsset(
  _previous: AssetState,
  formData: FormData
): Promise<AssetState> {
  const parsed = schema.safeParse({
    assetType: formData.get("assetType"),
    reason: formData.get("reason"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    estimatedValue: formData.get("estimatedValue"),
    horizon: formData.get("horizon") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const d = parsed.data;
  const supabase = await createClient();

  // A signed-in client gets the dossier attached to their profile; a visitor
  // leaves it null, which is what the RLS policy allows.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("asset_submissions").insert({
    client_id: user?.id ?? null,
    asset_type: d.assetType,
    reason: d.reason,
    description: d.description || null,
    estimated_value: d.estimatedValue,
    horizon: d.horizon || null,
    contact_name: d.contactName,
    contact_email: d.contactEmail,
    contact_phone: d.contactPhone,
  });

  if (error) {
    return {
      status: "error",
      message: "Une erreur est survenue. Veuillez réessayer dans un instant.",
    };
  }

  // Alerte l'équipe. Le dossier est déjà en base : un envoi raté est journalisé
  // dans sendAssetSubmissionNotification, jamais remonté au visiteur.
  await sendAssetSubmissionNotification({
    assetType: d.assetType,
    reason: d.reason,
    estimatedValue: d.estimatedValue,
    horizon: d.horizon || null,
    description: d.description || null,
    contact: { name: d.contactName, email: d.contactEmail, phone: d.contactPhone },
    fromClient: user !== null,
  });

  return { status: "success" };
}
