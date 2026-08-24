"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
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
  /** L'heure confirmée (ISO). Toujours renseignée en cas de succès. */
  bookedSlot?: string;
}

/**
 * Server-side validation is the only one that counts - the browser form can be
 * bypassed. The rules come from `@/lib/validation` so they stay identical to
 * the ones the visitor sees, and answers are checked against the published
 * option lists rather than accepted as free text.
 *
 * Le créneau (slot + hold + mode) est désormais OBLIGATOIRE : une demande
 * n'existe jamais sans rendez-vous. Sa validité métier (grille, capacité) reste
 * revérifiée par `book_slot` côté Postgres, seule autorité.
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
  slotStart: z.iso.datetime({ offset: true }),
  holdToken: z.uuid(),
  mode: z.enum(["presentiel", "visio"]),
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

  if (!(await rateLimit("rdv", { max: 5, windowSeconds: 600 }))) {
    return {
      status: "error",
      message: "Trop de demandes envoyées. Merci de patienter quelques minutes avant de réessayer.",
    };
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

  // Une adresse déjà rattachée à un compte ne peut pas servir à une réservation
  // visiteur : le rendez-vous serait détaché de ce compte (client_id anonyme),
  // invisible dans son espace. On demande une autre adresse, ou de se connecter.
  // No-op tant que la migration 013 n'est pas appliquée : la RPC absente renvoie
  // une erreur, `taken` reste falsy, et la réservation suit son cours.
  const { data: taken } = await supabase.rpc("email_has_account", { p_email: email });
  if (taken === true) {
    return {
      status: "error",
      message:
        "Cette adresse a déjà un espace client. Connectez-vous pour réserver, ou utilisez une autre adresse.",
    };
  }

  // On réserve D'ABORD. Si le créneau est parti entre-temps (hold expiré,
  // dernier conseiller pris), rien n'est enregistré : aucune demande orpheline,
  // sans rendez-vous, ne subsiste. Le visiteur revient en choisir un autre.
  const booked = await bookAndNotify({
    supabase,
    slotStart,
    holdToken,
    mode,
    type: "R0",
    client: { name: `${firstName} ${lastName}`, email },
  });

  if (!booked) {
    return {
      status: "error",
      message:
        "Ce créneau vient d'être pris. Revenez à l'étape précédente pour en choisir un autre.",
    };
  }

  // Le rendez-vous est confirmé : on attache le questionnaire, rattaché au
  // rendez-vous créé et déjà « planifie ». L'id est généré ici (un INSERT
  // anonyme avec RETURNING passerait par une policy SELECT absente pour `anon`).
  // Un échec d'écriture ici ne défait pas la réservation - on le journalise.
  const { error } = await supabase.from("appointment_requests").insert({
    id: crypto.randomUUID(),
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    besoins,
    besoin_autre: besoinAutre || null,
    patrimoine: patrimoine || null,
    investissement: investissement || null,
    message: message || null,
    appointment_id: booked.appointment_id,
    status: "planifie",
  });

  if (error) {
    console.error("[rdv] questionnaire non enregistré après réservation:", error);
  }

  return { status: "success", bookedSlot: slotStart };
}

/**
 * Le formulaire interroge ceci quand le visiteur quitte le champ email : cette
 * adresse a-t-elle déjà un espace client ? On répond false au moindre doute
 * (adresse invalide, RPC absente/en erreur) pour ne jamais bloquer à tort - la
 * vérification qui fait foi est celle de submitAppointmentRequest.
 */
export async function emailHasAccount(email: string): Promise<boolean> {
  const parsed = z.email().safeParse(email.trim());
  if (!parsed.success) return false;

  // Ce point est aussi une surface d'énumération d'emails : on le plafonne.
  if (!(await rateLimit("email-check", { max: 20, windowSeconds: 600 }))) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("email_has_account", { p_email: parsed.data });
  return !error && data === true;
}
