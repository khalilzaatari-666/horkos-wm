import "server-only";

import { Resend } from "resend";
import { emailHtml, escapeHtml } from "./template";
import { advisorRecipient, staffRecipients } from "./recipients";
import { SITE_NAME, CABINET_EMAIL, SITE_URL } from "@/lib/site";

/**
 * Prévient le conseiller qu'un client veut parler d'une recommandation.
 *
 * Le référent est prévenu seul quand il existe : c'est lui qui suit le dossier,
 * et diffuser la demande à toute l'équipe diluerait la responsabilité de la
 * reprise. Faute de référent - ou d'adresse - on retombe sur l'équipe, pour
 * qu'une demande ne se perde jamais.
 *
 * Contrat d'échec identique aux autres alertes : jamais bloquant pour le
 * client, seulement journalisé.
 */

export interface RecommendationQuestionInput {
  client: {
    name: string;
    email: string;
    phone: string | null;
  };
  /** Référent du client ; `null` quand il n'en a pas encore. */
  advisorId: string | null;
  recommendation: {
    id: string;
    title: string;
    category: string | null;
    /** Statut de l'attribution, tel que le client le voit. */
    statusLabel: string;
  };
  clientId: string;
}

export async function sendRecommendationQuestion(
  input: RecommendationQuestionInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY absente : demande d'échange non envoyée.");
    return;
  }

  const resend = new Resend(apiKey);
  const advisor = await advisorRecipient(input.advisorId);
  const to = advisor ? [advisor.email] : await staffRecipients();

  const rows: [string, string][] = [
    ["Client", escapeHtml(input.client.name)],
    ["Email", escapeHtml(input.client.email)],
    ...(input.client.phone
      ? ([["Téléphone", escapeHtml(input.client.phone)]] as [string, string][])
      : []),
    ["Recommandation", escapeHtml(input.recommendation.title)],
    ...(input.recommendation.category
      ? ([["Catégorie", escapeHtml(input.recommendation.category)]] as [string, string][])
      : []),
    ["Statut", escapeHtml(input.recommendation.statusLabel)],
    ["Conseiller référent", escapeHtml(advisor?.name ?? "Non assigné")],
  ];

  try {
    const result = await resend.emails.send({
      from: `${SITE_NAME} <${CABINET_EMAIL}>`,
      to,
      // Répondre à l'alerte écrit directement au client.
      replyTo: input.client.email,
      subject: `${input.client.name} souhaite parler de « ${input.recommendation.title} »`,
      html: emailHtml({
        title: "Demande d'échange sur une recommandation",
        intro: `${escapeHtml(input.client.name)} a demandé à en parler avec son conseiller depuis son espace.`,
        rows,
        note: "Le dossier complet est dans le back-office.",
        cta: {
          label: "Ouvrir le dossier client",
          url: `${SITE_URL}/admin/clients/${input.clientId}/recommandations`,
        },
      }),
    });
    if (result.error) {
      console.error("[email] demande d'échange refusée:", result.error);
    }
  } catch (err) {
    console.error("[email] demande d'échange échouée:", err);
  }
}
