"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { bookAndNotify } from "@/lib/booking";
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
  /**
   * L'heure réellement obtenue (ISO), ou null si le créneau n'a pas pu être
   * garanti — la demande, elle, est enregistrée dans tous les cas.
   */
  bookedSlot?: string | null;
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
  // Le créneau choisi au calendrier. Sa validité métier (grille, capacité) est
  // revérifiée par `book_slot` côté Postgres, seule autorité.
  slotStart: z.iso.datetime({ offset: true }).optional(),
  holdToken: z.uuid().optional(),
  mode: z.enum(["presentiel", "visio"]).optional(),
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
    slotStart: formData.get("slotStart") ?? undefined,
    holdToken: formData.get("holdToken") ?? undefined,
    mode: formData.get("mode") ?? undefined,
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
    slotStart,
    holdToken,
    mode,
  } = parsed.data;

  const supabase = await createClient();

  // L'id est généré ici et non par la base : un INSERT anonyme avec RETURNING
  // passerait par la policy SELECT, qui n'existe pas pour `anon` — c'est le
  // piège déjà rencontré au Sprint 2. Avec l'id en main, rien à relire.
  const requestId = crypto.randomUUID();

  const { error } = await supabase.from("appointment_requests").insert({
    id: requestId,
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

  // La demande est enregistrée quoi qu'il arrive ensuite : si le créneau a été
  // pris entre-temps (hold expiré, dernier conseiller réservé), on le dit sans
  // faire échouer l'envoi — le conseiller rappellera pour fixer l'heure.
  let bookedSlot: string | null = null;
  if (slotStart && holdToken && mode) {
    const booked = await bookAndNotify({
      supabase,
      slotStart,
      holdToken,
      mode,
      type: "R0",
      requestId,
      client: { name: `${firstName} ${lastName}`, email },
    });
    if (booked) bookedSlot = slotStart;
  }

  return { status: "success", bookedSlot };
}
