import "server-only";

import { Resend } from "resend";
import { emailHtml, escapeHtml } from "./template";
import { staffRecipients } from "./recipients";
import { SITE_NAME, CABINET_EMAIL } from "@/lib/site";

/**
 * Notifie l'équipe qu'un message de contact vient d'arriver. Le message est déjà
 * enregistré en base quand on arrive ici : l'échec d'envoi ne doit jamais bloquer
 * le visiteur - il est seulement journalisé. Le back-office (/admin) reste la
 * source de vérité ; cet email n'est qu'une alerte.
 */

export interface ContactEmailInput {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  /** Vrai si un client connecté a écrit ; faux pour un visiteur. */
  fromClient: boolean;
}

export async function sendContactNotification(input: ContactEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY absente : notification de contact non envoyée.");
    return;
  }

  const resend = new Resend(apiKey);
  const to = await staffRecipients();

  try {
    const result = await resend.emails.send({
      from: `${SITE_NAME} <${CABINET_EMAIL}>`,
      to,
      // Permet de répondre directement à l'expéditeur depuis l'alerte.
      replyTo: input.email,
      subject: `Contact - ${escapeHtml(input.subject)} - ${escapeHtml(input.name)}`,
      html: emailHtml({
        title: "Nouveau message de contact",
        intro: `${escapeHtml(input.name)} vous a écrit depuis le formulaire de contact.`,
        rows: [
          ["Sujet", escapeHtml(input.subject)],
          ["Nom", escapeHtml(input.name)],
          ["Email", escapeHtml(input.email)],
          ["Téléphone", escapeHtml(input.phone)],
          ["Origine", input.fromClient ? "Client connecté" : "Visiteur"],
        ],
        note: `Message :<br/>${escapeHtml(input.message).replace(/\n/g, "<br/>")}`,
      }),
    });
    if (result.error) {
      console.error("[email] notification de contact refusée:", result.error);
    }
  } catch (err) {
    console.error("[email] notification de contact échouée:", err);
  }
}
