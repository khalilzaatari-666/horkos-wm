import "server-only";

import { Resend } from "resend";
import { emailHtml, escapeHtml } from "./template";
import { staffRecipients } from "./recipients";
import { SITE_NAME, CABINET_EMAIL } from "@/lib/site";

/**
 * Notifie l'équipe qu'une proposition de partenariat vient d'arriver. Elle est
 * déjà enregistrée en base : l'échec d'envoi ne bloque jamais le visiteur, il
 * est seulement journalisé. Le back-office (/admin/demandes/partenariats) reste
 * la source de vérité ; cet email n'est qu'une alerte.
 */

export interface PartenariatEmailInput {
  name: string;
  company: string;
  email: string;
  phone: string;
  /** Libellé de la catégorie (« Assureur », « Agent immobilier »...). */
  partnerType: string;
  /** Détails déjà mis en forme, une ligne « Libellé : valeur » par champ. */
  message: string;
}

export async function sendPartenariatNotification(input: PartenariatEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY absente : notification de partenariat non envoyée.");
    return;
  }

  const resend = new Resend(apiKey);
  const to = await staffRecipients();

  try {
    const result = await resend.emails.send({
      from: `${SITE_NAME} <${CABINET_EMAIL}>`,
      to,
      replyTo: input.email,
      subject: `Partenariat - ${escapeHtml(input.partnerType)} - ${escapeHtml(input.company)}`,
      html: emailHtml({
        title: "Nouvelle proposition de partenariat",
        intro: `${escapeHtml(input.name)} (${escapeHtml(input.company)}) a rempli le questionnaire de partenariat.`,
        rows: [
          ["Catégorie", escapeHtml(input.partnerType)],
          ["Contact", escapeHtml(input.name)],
          ["Société", escapeHtml(input.company)],
          ["Email", escapeHtml(input.email)],
          ["Téléphone", escapeHtml(input.phone)],
        ],
        note: `Détails :<br/>${escapeHtml(input.message).replace(/\n/g, "<br/>")}`,
      }),
    });
    if (result.error) {
      console.error("[email] notification de partenariat refusée:", result.error);
    }
  } catch (err) {
    console.error("[email] notification de partenariat échouée:", err);
  }
}
