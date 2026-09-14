"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { besoinOptions, patrimoineOptions, investissementOptions } from "@/lib/rdv-options";
import {
  NAME_MAX,
  PHONE_MAX,
  MESSAGE_MAX,
  BESOIN_AUTRE_MAX,
  NAME_REGEX,
  PHONE_FULL_REGEX,
} from "@/lib/validation";

export interface IntakeState {
  status: "idle" | "error";
  message?: string;
}

const AUTRE_BESOIN = "Autre besoin";

/**
 * Mêmes règles que le questionnaire de rendez-vous : le client ne doit pas
 * rencontrer deux exigences différentes pour les mêmes champs selon la porte
 * par laquelle il entre.
 */
const schema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "Le prénom est trop court.")
      .max(NAME_MAX)
      .regex(NAME_REGEX, "Le prénom contient des caractères non autorisés."),
    lastName: z
      .string()
      .trim()
      .min(2, "Le nom est trop court.")
      .max(NAME_MAX)
      .regex(NAME_REGEX, "Le nom contient des caractères non autorisés."),
    phone: z
      .string()
      .trim()
      .max(PHONE_MAX)
      .regex(PHONE_FULL_REGEX, "Numéro de téléphone invalide."),
    besoins: z
      .array(z.enum(besoinOptions))
      .min(1, "Choisissez au moins un besoin.")
      .max(besoinOptions.length),
    besoinAutre: z.string().trim().max(BESOIN_AUTRE_MAX).optional().or(z.literal("")),
    patrimoine: z.enum(patrimoineOptions, { message: "Choisissez une tranche de patrimoine." }),
    investissement: z.enum(investissementOptions, {
      message: "Choisissez un montant d'investissement.",
    }),
    message: z.string().trim().max(MESSAGE_MAX).optional().or(z.literal("")),
  })
  .refine((d) => !d.besoins.includes(AUTRE_BESOIN) || Boolean(d.besoinAutre?.trim()), {
    message: "Précisez votre autre besoin.",
    path: ["besoinAutre"],
  });

/**
 * Enregistre le questionnaire d'entrée, puis ouvre l'espace.
 *
 * Deux écritures, dans cet ordre : l'identité sur `profiles`, le questionnaire
 * sur `client_intake`. Si la seconde échoue, la porte reste fermée et le client
 * revient sur ce formulaire - l'inverse laisserait entrer quelqu'un dont on
 * n'aurait gardé que le nom.
 */
export async function completerProfil(
  _previous: IntakeState,
  formData: FormData
): Promise<IntakeState> {
  const parsed = schema.safeParse({
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    phone: formData.get("phone") ?? "",
    besoins: formData.getAll("besoins"),
    besoinAutre: formData.get("besoinAutre") ?? "",
    patrimoine: formData.get("patrimoine") ?? "",
    investissement: formData.get("investissement") ?? "",
    message: formData.get("message") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  if (!(await rateLimit("intake", { max: 10, windowSeconds: 600 }))) {
    return { status: "error", message: "Trop de tentatives. Patientez quelques minutes." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Session expirée. Reconnectez-vous." };

  const d = parsed.data;

  const { error: profilError } = await supabase
    .from("profiles")
    .update({ first_name: d.firstName, last_name: d.lastName, phone: d.phone })
    .eq("id", user.id);

  if (profilError) {
    return { status: "error", message: "Enregistrement impossible. Réessayez." };
  }

  const { error: intakeError } = await supabase.from("client_intake").upsert(
    {
      client_id: user.id,
      besoins: d.besoins,
      besoin_autre: d.besoins.includes(AUTRE_BESOIN) ? (d.besoinAutre || null) : null,
      patrimoine: d.patrimoine,
      investissement: d.investissement,
      message: d.message || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" }
  );

  if (intakeError) {
    return { status: "error", message: "Enregistrement impossible. Réessayez." };
  }

  revalidatePath("/espace", "layout");
  redirect("/espace");
}
