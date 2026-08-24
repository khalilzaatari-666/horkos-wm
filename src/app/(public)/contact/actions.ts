"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendContactNotification } from "@/lib/email/contact";
import { contactSubjectOptions } from "@/lib/contact-options";
import {
  NAME_REGEX,
  NAME_MAX,
  EMAIL_MAX,
  MESSAGE_MAX,
  validatePhoneFull,
} from "@/lib/validation";

export interface ContactState {
  status: "idle" | "success" | "error";
  message?: string;
}

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom est trop court.")
    .max(NAME_MAX, "Le nom est trop long.")
    .regex(NAME_REGEX, "Le nom ne doit contenir que des lettres."),
  email: z.email("Veuillez entrer une adresse email valide.").max(EMAIL_MAX),
  phone: z
    .string()
    .trim()
    .refine((v) => validatePhoneFull(v) === null, "Numéro de téléphone invalide."),
  subject: z.enum(contactSubjectOptions, { message: "Sélectionnez un sujet." }),
  message: z
    .string()
    .trim()
    .min(10, "Votre message est trop court.")
    .max(MESSAGE_MAX, "Votre message est trop long."),
});

export async function submitContact(
  _previous: ContactState,
  formData: FormData
): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  if (!(await rateLimit("contact", { max: 5, windowSeconds: 600 }))) {
    return {
      status: "error",
      message: "Trop de messages envoyés. Merci de patienter quelques minutes avant de réessayer.",
    };
  }

  const d = parsed.data;
  const supabase = await createClient();

  // Un client connecté est identifié pour l'alerte ; un visiteur reste anonyme.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("contacts").insert({
    name: d.name,
    email: d.email,
    phone: d.phone,
    subject: d.subject,
    message: d.message,
    status: "nouveau",
  });

  if (error) {
    return {
      status: "error",
      message: "Une erreur est survenue. Veuillez réessayer dans un instant.",
    };
  }

  // Alerte l'équipe. Le message est déjà en base : un envoi raté est journalisé
  // dans sendContactNotification, jamais remonté au visiteur.
  await sendContactNotification({
    name: d.name,
    email: d.email,
    phone: d.phone,
    subject: d.subject,
    message: d.message,
    fromClient: user !== null,
  });

  return { status: "success" };
}
