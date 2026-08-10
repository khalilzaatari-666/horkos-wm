"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { besoinOptions, patrimoineOptions, investissementOptions } from "@/lib/rdv-options";
import {
  NAME_REGEX,
  NAME_MAX,
  EMAIL_MAX,
  MESSAGE_MAX,
  BESOIN_AUTRE_MAX,
  validatePhoneFull,
} from "@/lib/validation";

export interface RdvState {
  status: "idle" | "success" | "error";
  message?: string;
}

/**
 * Server-side validation is the only one that counts — the browser form can be
 * bypassed. The rules come from `@/lib/validation` so they stay identical to
 * the ones the visitor sees, and answers are checked against the published
 * option lists rather than accepted as free text.
 */
const schema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Le prénom est trop court.")
    .max(NAME_MAX)
    .regex(NAME_REGEX, "Le prénom ne doit contenir que des lettres."),
  lastName: z
    .string()
    .trim()
    .min(2, "Le nom est trop court.")
    .max(NAME_MAX)
    .regex(NAME_REGEX, "Le nom ne doit contenir que des lettres."),
  email: z.email("Veuillez entrer une adresse email valide.").max(EMAIL_MAX),
  // Now required: the promise on screen is that a conseiller calls back.
  phone: z
    .string()
    .trim()
    .refine((v) => validatePhoneFull(v) === null, "Numéro de téléphone invalide."),
  besoins: z
    .array(z.enum(besoinOptions))
    .min(1, "Sélectionnez au moins un besoin.")
    .max(besoinOptions.length),
  patrimoine: z.enum(patrimoineOptions).optional().or(z.literal("")),
  investissement: z.enum(investissementOptions).optional().or(z.literal("")),
  message: z.string().trim().max(MESSAGE_MAX).optional().or(z.literal("")),
  besoinAutre: z.string().trim().max(BESOIN_AUTRE_MAX).optional().or(z.literal("")),
})
  // Ticking "Autre besoin" without saying which one tells the conseiller
  // nothing, so the precision travels with it.
  .refine(
    (d) => !d.besoins.includes("Autre besoin") || (d.besoinAutre ?? "").length >= 3,
    { message: "Précisez votre autre besoin.", path: ["besoinAutre"] }
  );

export async function submitAppointmentRequest(
  _previous: RdvState,
  formData: FormData
): Promise<RdvState> {
  const parsed = schema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    besoins: formData.getAll("besoins"),
    patrimoine: formData.get("patrimoine") ?? "",
    investissement: formData.get("investissement") ?? "",
    message: formData.get("message") ?? "",
    besoinAutre: formData.get("besoinAutre") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    besoins,
    patrimoine,
    investissement,
    message,
    besoinAutre,
  } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("appointment_requests").insert({
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    besoins,
    besoin_autre: besoinAutre || null,
    patrimoine: patrimoine || null,
    investissement: investissement || null,
    message: message || null,
  });

  if (error) {
    return {
      status: "error",
      message: "Une erreur est survenue. Veuillez réessayer dans un instant.",
    };
  }

  // TODO: notifier le conseiller par email (Resend) une fois le SMTP configuré.
  return { status: "success" };
}
