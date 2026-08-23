import "server-only";

import { Resend } from "resend";
import { buildIcs } from "./ics";
import { emailHtml, escapeHtml } from "./template";
import { SITE_NAME, CABINET_EMAIL, CABINET_ADDRESS } from "@/lib/site";

/**
 * Emails de confirmation d'un rendez-vous - un au client, un au conseiller.
 *
 * L'agenda Google du cabinet porte déjà l'événement (voir `@/lib/booking`), ce
 * qui suffit aux comptes du domaine. L'invitation ICS jointe couvre tous les
 * autres : un client sous Outlook, Apple Mail ou une messagerie d'entreprise ne
 * verrait rien sans elle.
 *
 * Ces emails sont notre propre confirmation, à la charte du cabinet - d'où le
 * `sendUpdates=none` côté Google, qui évite au client d'en recevoir deux.
 *
 * Contrat d'échec : comme l'agenda, jamais bloquant. La réservation est déjà
 * confirmée en base quand on arrive ici ; un email perdu se rattrape, un
 * créneau perdu non.
 */

export interface AppointmentEmailInput {
  appointmentId: string;
  /** Début du rendez-vous, ISO. */
  slotIso: string;
  mode: "presentiel" | "visio";
  /** Lien Meet - null si la création a échoué, l'email l'annonce alors. */
  meetingUrl: string | null;
  client: { name: string; email: string };
  advisor: { name: string; email: string | null };
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Casablanca",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatSlot(iso: string): string {
  const s = dateFmt.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function sendAppointmentEmails(input: AppointmentEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY absente : confirmations de rendez-vous non envoyées.");
    return;
  }

  const resend = new Resend(apiKey);
  const when = formatSlot(input.slotIso);
  const isVisio = input.mode === "visio";
  const location = isVisio ? (input.meetingUrl ?? "Visioconférence") : CABINET_ADDRESS;

  const attendees = [
    { name: input.client.name, email: input.client.email },
    ...(input.advisor.email ? [{ name: input.advisor.name, email: input.advisor.email }] : []),
  ];

  const ics = buildIcs({
    uid: input.appointmentId,
    startIso: input.slotIso,
    durationMin: 60,
    summary: `Rendez-vous ${SITE_NAME}`,
    description: isVisio
      ? input.meetingUrl
        ? `Rendez-vous en visioconférence.\nRejoindre : ${input.meetingUrl}`
        : "Rendez-vous en visioconférence. Le lien vous sera transmis par votre conseiller."
      : `Rendez-vous au cabinet.\n${CABINET_ADDRESS}`,
    location,
    organizer: { name: SITE_NAME, email: CABINET_EMAIL },
    attendees,
  });
  const icsAttachment = {
    filename: "invitation.ics",
    content: Buffer.from(ics).toString("base64"),
    contentType: "text/calendar; method=REQUEST",
  };

  const modeRow: [string, string] = isVisio
    ? [
        "Format",
        input.meetingUrl
          ? `En visioconférence - <a href="${escapeHtml(input.meetingUrl)}" style="color:#A9784F;">rejoindre la réunion</a>`
          : "En visioconférence - le lien vous sera envoyé avant le rendez-vous",
      ]
    : ["Format", `Au cabinet - ${escapeHtml(CABINET_ADDRESS)}`];

  const clientEmail = resend.emails.send({
    from: `${SITE_NAME} <${CABINET_EMAIL}>`,
    to: input.client.email,
    subject: `Votre rendez-vous Horkos - ${when}`,
    html: emailHtml({
      title: "Votre rendez-vous est confirmé",
      intro: `Bonjour ${escapeHtml(input.client.name)}, votre rendez-vous avec notre cabinet est confirmé. L'invitation jointe l'ajoute à votre calendrier.`,
      rows: [
        ["Date", when],
        modeRow,
        ["Conseiller", escapeHtml(input.advisor.name)],
        ["Durée", "1 heure"],
      ],
      note: "Un empêchement ? Répondez simplement à cet email, nous vous proposerons une autre heure. Le premier rendez-vous est gratuit et sans engagement.",
    }),
    attachments: [icsAttachment],
  });

  // Le conseiller reçoit sa propre confirmation - c'est aussi elle qui pose le
  // rendez-vous dans SON calendrier via la même invitation.
  const advisorEmail = input.advisor.email
    ? resend.emails.send({
        from: `${SITE_NAME} <${CABINET_EMAIL}>`,
        to: input.advisor.email,
        subject: `Nouveau rendez-vous - ${escapeHtml(input.client.name)} - ${when}`,
        html: emailHtml({
          title: "Nouveau rendez-vous réservé",
          intro: `${escapeHtml(input.client.name)} vient de réserver un créneau avec vous.`,
          rows: [
            ["Date", when],
            modeRow,
            ["Client", escapeHtml(input.client.name)],
            ["Email", escapeHtml(input.client.email)],
          ],
          note: isVisio && !input.meetingUrl
            ? "La création automatique de la réunion Google Meet a échoué : pensez à envoyer votre lien au client avant le rendez-vous."
            : "L'invitation jointe ajoute ce rendez-vous à votre calendrier.",
        }),
        attachments: [icsAttachment],
      })
    : Promise.resolve(null);

  const [clientResult, advisorResult] = await Promise.allSettled([clientEmail, advisorEmail]);
  for (const [who, result] of [
    ["client", clientResult],
    ["conseiller", advisorResult],
  ] as const) {
    if (result.status === "rejected") {
      console.error(`[email] envoi ${who} échoué:`, result.reason);
    } else if (result.value && "error" in result.value && result.value.error) {
      console.error(`[email] envoi ${who} refusé:`, result.value.error);
    }
  }
}
