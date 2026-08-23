import "server-only";

import { Resend } from "resend";
import { emailHtml, escapeHtml } from "./template";
import { staffRecipients } from "./recipients";
import { SITE_NAME, CABINET_EMAIL } from "@/lib/site";

/**
 * Notifie l'équipe qu'un nouveau dossier de cession vient d'arriver. La
 * soumission est déjà enregistrée en base quand on arrive ici : comme pour les
 * rendez-vous, l'échec d'envoi ne doit jamais bloquer le visiteur — il est
 * seulement journalisé. Le back-office (/admin/soumissions) reste la source de
 * vérité ; cet email n'est qu'une alerte.
 */

export interface AssetSubmissionEmailInput {
  assetType: string;
  reason: string;
  /** Valeur estimée en dirhams. */
  estimatedValue: number;
  horizon: string | null;
  description: string | null;
  contact: { name: string; email: string; phone: string };
  /** Vrai si un client connecté a soumis ; faux pour un visiteur. */
  fromClient: boolean;
}

const currencyFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "MAD",
  maximumFractionDigits: 0,
});

export async function sendAssetSubmissionNotification(
  input: AssetSubmissionEmailInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY absente : notification de soumission non envoyée.");
    return;
  }

  const resend = new Resend(apiKey);
  const to = await staffRecipients();

  const rows: [string, string][] = [
    ["Type d'actif", escapeHtml(input.assetType)],
    ["Motif", escapeHtml(input.reason)],
    ["Valeur estimée", escapeHtml(currencyFmt.format(input.estimatedValue))],
    ...(input.horizon ? ([["Horizon", escapeHtml(input.horizon)]] as [string, string][]) : []),
    ["Contact", escapeHtml(input.contact.name)],
    ["Email", escapeHtml(input.contact.email)],
    ["Téléphone", escapeHtml(input.contact.phone)],
    ["Origine", input.fromClient ? "Client connecté" : "Visiteur"],
  ];

  const note = input.description
    ? `Description :<br/>${escapeHtml(input.description).replace(/\n/g, "<br/>")}`
    : "Aucune description fournie. Retrouvez le dossier dans le back-office (Soumissions).";

  try {
    const result = await resend.emails.send({
      from: `${SITE_NAME} <${CABINET_EMAIL}>`,
      to,
      // Permet de répondre directement au prospect depuis l'alerte.
      replyTo: input.contact.email,
      subject: `Nouveau dossier de cession - ${escapeHtml(input.contact.name)}`,
      html: emailHtml({
        title: "Nouveau dossier de cession",
        intro: `${escapeHtml(input.contact.name)} vient de soumettre un actif à céder.`,
        rows,
        note,
      }),
    });
    if (result.error) {
      console.error("[email] notification de soumission refusée:", result.error);
    }
  } catch (err) {
    console.error("[email] notification de soumission échouée:", err);
  }
}
