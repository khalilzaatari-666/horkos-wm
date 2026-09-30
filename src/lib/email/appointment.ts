import "server-only";

import { Resend } from "resend";
import { buildIcs } from "./ics";
import { emailHtml, escapeHtml } from "./template";
import { SITE_NAME, CABINET_EMAIL, CABINET_ADDRESS } from "@/lib/site";
import { titreRendezVous, dureeRendezVous, libelleDuree } from "@/lib/rendez-vous";

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
  /** L'étape du parcours : elle donne l'intitulé et la durée. */
  type: string;
  mode: "presentiel" | "visio";
  /** Lien Meet - null si la création a échoué, l'email l'annonce alors. */
  meetingUrl: string | null;
  client: { name: string; email: string };
  advisor: { name: string; email: string | null };
  /**
   * D'où vient le rendez-vous, pour les mots de l'email : réservé par le client
   * (par défaut), fixé par le conseiller depuis le suivi, ou déplacé.
   */
  motif?: Motif;
}

type Motif = "reservation" | "planifie" | "deplace";

/** Titre et première phrase, côté client puis côté conseiller. */
function textes(motif: Motif, client: string) {
  const nom = escapeHtml(client);
  if (motif === "deplace") {
    return {
      client: {
        title: "Votre rendez-vous a été déplacé",
        intro: `Bonjour ${nom}, votre rendez-vous avec notre cabinet a été déplacé à la date ci-dessous. L'invitation jointe met votre calendrier à jour.`,
      },
      conseiller: { title: "Rendez-vous déplacé", intro: `Le rendez-vous avec ${nom} a été déplacé.` },
    };
  }
  if (motif === "planifie") {
    return {
      client: {
        title: "Votre rendez-vous est planifié",
        intro: `Bonjour ${nom}, votre conseiller a fixé votre prochain rendez-vous avec notre cabinet. L'invitation jointe l'ajoute à votre calendrier.`,
      },
      conseiller: { title: "Rendez-vous planifié", intro: `Le rendez-vous avec ${nom} est posé.` },
    };
  }
  return {
    client: {
      title: "Votre rendez-vous est confirmé",
      intro: `Bonjour ${nom}, votre rendez-vous avec notre cabinet est confirmé. L'invitation jointe l'ajoute à votre calendrier.`,
    },
    conseiller: {
      title: "Nouveau rendez-vous réservé",
      intro: `${nom} vient de réserver un créneau avec vous.`,
    },
  };
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
  const motif = input.motif ?? "reservation";
  const mots = textes(motif, input.client.name);
  const when = formatSlot(input.slotIso);
  const isVisio = input.mode === "visio";
  const titre = titreRendezVous(input.type, input.client.name);
  const duree = dureeRendezVous(input.type);
  const location = isVisio ? (input.meetingUrl ?? "Visioconférence") : CABINET_ADDRESS;

  const attendees = [
    { name: input.client.name, email: input.client.email },
    ...(input.advisor.email ? [{ name: input.advisor.name, email: input.advisor.email }] : []),
  ];

  const ics = buildIcs({
    uid: input.appointmentId,
    startIso: input.slotIso,
    durationMin: duree,
    summary: titre,
    description: isVisio
      ? input.meetingUrl
        ? `Rendez-vous en visioconférence.\nRejoindre : ${input.meetingUrl}`
        : "Rendez-vous en visioconférence. Le lien vous sera transmis par votre conseiller."
      : `Rendez-vous au cabinet.\n${CABINET_ADDRESS}`,
    location,
    organizer: { name: SITE_NAME, email: CABINET_EMAIL },
    attendees,
    // Même UID, séquence toujours plus haute : le calendrier remplace la
    // version qu'il détient. Une séquence fixe serait ignorée après une
    // annulation (dont la séquence est l'horodatage) - un rendez-vous rétabli
    // ne reviendrait jamais dans le calendrier du client.
    sequence: Math.floor(Date.now() / 1000),
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
    subject: `${titre} - ${when}`,
    html: emailHtml({
      ...mots.client,
      rows: [
        ["Date", when],
        modeRow,
        ["Conseiller", escapeHtml(input.advisor.name)],
        ["Durée", libelleDuree(duree)],
      ],
      note:
        "Un empêchement ? Répondez simplement à cet email, nous vous proposerons une autre heure." +
        (input.type === "R0" ? " Le premier rendez-vous est gratuit et sans engagement." : ""),
    }),
    attachments: [icsAttachment],
  });

  // Le conseiller reçoit sa propre confirmation - c'est aussi elle qui pose le
  // rendez-vous dans SON calendrier via la même invitation.
  const advisorEmail = input.advisor.email
    ? resend.emails.send({
        from: `${SITE_NAME} <${CABINET_EMAIL}>`,
        to: input.advisor.email,
        subject: `${titre} - ${when}`,
        html: emailHtml({
          ...mots.conseiller,
          rows: [
            ["Date", when],
            modeRow,
            ["Durée", libelleDuree(duree)],
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

/**
 * Le cabinet annule un rendez-vous : le client en est prévenu, et l'invitation
 * `CANCEL` retire l'événement des calendriers qui avaient accepté l'ICS de
 * confirmation - Outlook ou Apple ne connaissent pas l'agenda Google du cabinet.
 *
 * Même contrat d'échec que la confirmation : un log, jamais une exception.
 */
export async function sendCancellationEmail(input: {
  appointmentId: string;
  slotIso: string;
  type: string;
  client: { name: string; email: string };
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY absente : annulation de rendez-vous non envoyée.");
    return;
  }

  const titre = titreRendezVous(input.type, input.client.name);
  const ics = buildIcs({
    uid: input.appointmentId,
    startIso: input.slotIso,
    durationMin: dureeRendezVous(input.type),
    summary: titre,
    organizer: { name: SITE_NAME, email: CABINET_EMAIL },
    attendees: [{ name: input.client.name, email: input.client.email }],
    method: "CANCEL",
    sequence: Math.floor(Date.now() / 1000),
  });

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: `${SITE_NAME} <${CABINET_EMAIL}>`,
      to: input.client.email,
      subject: `Annulé : ${titre} - ${formatSlot(input.slotIso)}`,
      html: emailHtml({
        title: "Votre rendez-vous est annulé",
        intro: `Bonjour ${escapeHtml(input.client.name)}, le rendez-vous ci-dessous est annulé.`,
        rows: [["Date", formatSlot(input.slotIso)]],
        note: "Pour convenir d'une autre date, répondez simplement à cet email.",
      }),
      attachments: [
        {
          filename: "annulation.ics",
          content: Buffer.from(ics).toString("base64"),
          contentType: "text/calendar; method=CANCEL",
        },
      ],
    });
    if (error) console.error("[email] annulation refusée:", error);
  } catch (error) {
    console.error("[email] annulation échouée:", error);
  }
}
