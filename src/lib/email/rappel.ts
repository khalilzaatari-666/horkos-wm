import "server-only";

import { Resend } from "resend";
import { emailHtml, escapeHtml } from "./template";
import { advisorRecipient, staffRecipients } from "./recipients";
import { SITE_NAME, CABINET_EMAIL, SITE_URL } from "@/lib/site";

/**
 * Le pense-bête que le conseiller s'est posé après le R0, renvoyé à l'échéance.
 *
 * Même règle de destinataire que les autres alertes internes : le référent
 * seul quand il existe, car c'est lui qui suit le dossier et diffuser à toute
 * l'équipe diluerait la responsabilité de la reprise. Faute de référent - ou
 * d'adresse - on retombe sur l'équipe, pour qu'un rappel ne se perde jamais.
 *
 * Contrat d'échec différent des autres modules, en revanche : ici le résultat
 * est **retourné**. Le cron doit savoir s'il peut marquer le rappel envoyé, et
 * un échec avalé ferait disparaître la relance sans que personne ne le sache.
 */

export interface RappelInput {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  /** Référent du client ; `null` quand il n'en a pas. */
  advisorId: string | null;
  /** Le mot que le conseiller s'était laissé. */
  note: string | null;
  /** Déjà formatés à l'heure du cabinet par l'appelant. */
  poseLe: string;
  echeanceLe: string;
}

export type ResultatEnvoi = { ok: true } | { ok: false; erreur: string };

export async function sendRappelR1(input: RappelInput): Promise<ResultatEnvoi> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY absente : rappel non envoyé.");
    return { ok: false, erreur: "RESEND_API_KEY absente" };
  }

  const resend = new Resend(apiKey);
  const advisor = await advisorRecipient(input.advisorId);
  const to = advisor ? [advisor.email] : await staffRecipients();

  const rows: [string, string][] = [
    ["Client", escapeHtml(input.client.name)],
    ...(input.client.email
      ? ([["Email", escapeHtml(input.client.email)]] as [string, string][])
      : []),
    ...(input.client.phone
      ? ([["Téléphone", escapeHtml(input.client.phone)]] as [string, string][])
      : []),
    ["Rappel posé le", escapeHtml(input.poseLe)],
    ["Échéance", escapeHtml(input.echeanceLe)],
    ...(input.note ? ([["Votre note", escapeHtml(input.note)]] as [string, string][]) : []),
  ];

  try {
    const result = await resend.emails.send({
      from: `${SITE_NAME} <${CABINET_EMAIL}>`,
      to,
      // Répondre au rappel écrit directement au client : c'est très exactement
      // le geste que le rappel demande.
      ...(input.client.email ? { replyTo: input.client.email } : {}),
      subject: `Rappel : relancer ${input.client.name} pour le R1`,
      html: emailHtml({
        title: "Relance à faire",
        intro: `Vous aviez demandé à être rappelé de reprendre contact avec ${escapeHtml(
          input.client.name
        )} pour convenir du R1.`,
        rows,
        note: "Ce rappel ne part qu'une fois. Si le R1 avait déjà été planifié, vous ne l'auriez pas reçu.",
        cta: {
          label: "Ouvrir le suivi du client",
          url: `${SITE_URL}/admin/clients/${input.client.id}/suivi`,
        },
      }),
    });

    if (result.error) {
      console.error("[email] rappel refusé:", result.error);
      return { ok: false, erreur: result.error.message ?? "Envoi refusé" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] rappel échoué:", err);
    return { ok: false, erreur: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}
