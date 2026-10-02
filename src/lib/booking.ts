import "server-only";

import type { createClient } from "@/lib/supabase/server";
import {
  createAppointmentEvent,
  addEventAttendee,
  deleteAppointmentEvent,
  agendaOccupe,
  chevauche,
  type Occupation,
} from "@/lib/google-calendar";
import { sendAppointmentEmails, sendCancellationEmail } from "@/lib/email/appointment";
import { advisorRecipient } from "@/lib/email/recipients";
import { createAdminClient } from "@/lib/supabase/admin";
import { CABINET_ADDRESS } from "@/lib/site";
import { titreRendezVous, dureeRendezVous } from "@/lib/rendez-vous";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Ce que `book_slot` rend à l'appelant qui vient de réserver. */
interface BookSlotResult {
  appointment_id: string;
  slot_start: string;
  mode: "presentiel" | "visio";
  advisor_first_name: string | null;
  advisor_last_name: string | null;
  advisor_email: string | null;
}

export interface BookAndNotifyInput {
  supabase: SupabaseServerClient;
  slotStart: string;
  holdToken: string;
  mode: "presentiel" | "visio";
  type: "R0" | "R1" | "R2" | "revue" | "autre";
  requestId?: string | null;
  client: { name: string; email: string };
}

/**
 * Réserve un créneau, pose l'événement dans l'agenda du cabinet, puis prévient
 * client et conseiller.
 *
 * L'ordre est contraint par deux faits qui tirent en sens inverse :
 *   - le lien Meet doit exister AVANT `book_slot`, puisque l'écrire après
 *     supposerait un UPDATE sur un rendez-vous qu'un visiteur anonyme n'a pas
 *     le droit de toucher ;
 *   - le conseiller assigné n'est connu qu'APRÈS `book_slot`.
 * D'où la séquence : créer l'événement (client seul) → réserver → compléter
 * l'événement avec le conseiller. Si la réservation échoue entre les deux,
 * l'événement orphelin est supprimé.
 *
 * L'agenda reçoit les deux modes, pas seulement la visio : un rendez-vous au
 * cabinet doit lui aussi bloquer le créneau du conseiller, avec l'adresse en
 * lieu.
 *
 * Trois échecs, trois traitements distincts :
 *   - Google indisponible -> on réserve quand même, sans lien ; l'email le dit.
 *   - créneau déjà pris    -> on rend `null`, l'appelant l'annonce.
 *   - email refusé         -> loggé seulement : le rendez-vous existe, lui.
 */
export async function bookAndNotify(
  input: BookAndNotifyInput
): Promise<BookSlotResult | null> {
  const { supabase, slotStart, holdToken, mode, type, requestId, client } = input;
  const isVisio = mode === "visio";
  // L'intitulé et la durée viennent de l'étape, pas du mode : c'est la même
  // règle dans l'agenda, dans l'invitation ICS et dans les emails.
  const titre = titreRendezVous(type, client.name);
  const duree = dureeRendezVous(type);

  // L'agenda de l'admin a pu se remplir depuis l'affichage des créneaux : même
  // refus que si le créneau était parti, l'appelant recharge la disponibilité.
  const finIso = new Date(Date.parse(slotStart) + duree * 60_000).toISOString();
  const occupe = await occupationsAdmin(slotStart, finIso);
  if (occupe && chevauche(slotStart, duree, occupe)) return null;

  const event = await createAppointmentEvent({
    summary: titre,
    description: isVisio
      ? "Rendez-vous en visioconférence avec votre conseiller Horkos."
      : `Rendez-vous au cabinet Horkos.\n${CABINET_ADDRESS}`,
    startIso: slotStart,
    durationMin: duree,
    attendees: [{ email: client.email, displayName: client.name }],
    location: isVisio ? undefined : CABINET_ADDRESS,
    withMeet: isVisio,
  });

  const meetingUrl = isVisio ? (event?.meetLink ?? null) : null;

  const { data, error } = await supabase.rpc("book_slot", {
    p_slot_start: slotStart,
    p_token: holdToken,
    p_type: type,
    p_request_id: requestId ?? null,
    p_mode: mode,
    p_meeting_url: meetingUrl,
  });

  const booked = (data ?? null) as BookSlotResult | null;

  if (error || !booked) {
    // Le créneau est parti entre le hold et la confirmation : ne pas laisser un
    // événement fantôme dans l'agenda du cabinet.
    if (event) await deleteAppointmentEvent(event.eventId);
    return null;
  }

  // L'événement est rattaché au rendez-vous pour qu'une annulation ou un
  // déplacement depuis le suivi sache quoi retirer. Clé de service : le
  // visiteur n'a pas le droit d'écrire sur `appointments`, et l'écriture ne
  // touche qu'une colonne de la ligne que `book_slot` vient de lui rendre.
  if (event) {
    await createAdminClient()
      ?.from("appointments")
      .update({ calendar_event_id: event.eventId })
      .eq("id", booked.appointment_id);
  }

  const advisorName =
    [booked.advisor_first_name, booked.advisor_last_name].filter(Boolean).join(" ") ||
    "votre conseiller";

  // Le conseiller n'était pas connu à la création : il rejoint l'événement
  // maintenant, ce qui le fait apparaître dans son propre agenda Google.
  if (event && booked.advisor_email) {
    await addEventAttendee(event.eventId, [
      { email: booked.advisor_email, displayName: advisorName },
    ]);
  }

  await sendAppointmentEmails({
    appointmentId: booked.appointment_id,
    slotIso: slotStart,
    type,
    mode,
    meetingUrl,
    client,
    advisor: { name: advisorName, email: booked.advisor_email },
  });

  return booked;
}

/**
 * Les plages où l'admin est pris dans son agenda Google, rendez-vous de l'app
 * exclus : ceux-là, Postgres les compte déjà conseiller par conseiller, et les
 * laisser bloquer fermerait le créneau aux autres conseillers libres.
 *
 * Clé de service, faute de session chez un visiteur : elle ne lit que les
 * identifiants d'événements, et rien de ce qu'elle lit ne sort d'ici.
 * `null` -> ne rien filtrer (Google ou la clé indisponibles).
 */
export async function occupationsAdmin(
  fromIso: string,
  toIso: string
): Promise<Occupation[] | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  // Une journée de marge avant : un rendez-vous commencé la veille de la fenêtre
  // peut encore y déborder.
  const { data, error } = await admin
    .from("appointments")
    .select("calendar_event_id")
    .not("calendar_event_id", "is", null)
    .gte("date", new Date(Date.parse(fromIso) - 86_400_000).toISOString())
    .lt("date", toIso);
  if (error) return null;

  const ids = new Set((data ?? []).map((r: { calendar_event_id: string }) => r.calendar_event_id));
  return agendaOccupe(fromIso, toIso, ids);
}

/** Un rendez-vous tel que le suivi le relit avant de prévenir qui que ce soit. */
export interface RendezVousANotifier {
  id: string;
  client_id: string;
  advisor_id: string | null;
  type: string;
  mode: string | null;
  date: string;
  calendar_event_id: string | null;
}

/** Le client (nom, adresse) et le conseiller d'un rendez-vous. `null` sans adresse client. */
async function participants(
  supabase: SupabaseServerClient,
  clientId: string,
  advisorId: string | null
) {
  const [{ data: client }, advisor] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, email").eq("id", clientId).maybeSingle(),
    advisorRecipient(advisorId),
  ]);
  const email = (client?.email as string | null)?.trim();
  if (!email) return null;
  return {
    client: {
      name: [client?.first_name, client?.last_name].filter(Boolean).join(" ") || email,
      email,
    },
    advisor,
  };
}

/**
 * Un rendez-vous fixé par le cabinet - planifié depuis le suivi, déplacé ou
 * rétabli : il entre dans les agendas et le client est prévenu, comme s'il
 * l'avait réservé lui-même.
 *
 * L'ancien événement, s'il existe, est supprimé puis recréé plutôt que
 * modifié : un déplacement en visio reçoit un nouveau lien Meet, que l'email
 * porte. Le client comme le conseiller sont invités dès la création, puisqu'on
 * les connaît déjà ici - contrairement à `bookAndNotify`.
 *
 * Même contrat d'échec que la réservation : rien ne lève. Google absent → pas
 * d'événement ni de lien, l'email le dit ; email refusé → un log.
 */
export async function inviterAuRendezVous(input: {
  supabase: SupabaseServerClient;
  rdv: RendezVousANotifier;
  motif: "planifie" | "deplace";
}): Promise<void> {
  const { supabase, rdv, motif } = input;
  if (rdv.calendar_event_id) await deleteAppointmentEvent(rdv.calendar_event_id);

  const gens = await participants(supabase, rdv.client_id, rdv.advisor_id);
  if (!gens) {
    console.warn("[booking] client sans adresse : ni invitation ni email.", rdv.id);
    await supabase.from("appointments").update({ calendar_event_id: null }).eq("id", rdv.id);
    return;
  }

  const mode = rdv.mode === "visio" ? "visio" : "presentiel";
  const isVisio = mode === "visio";
  const event = await createAppointmentEvent({
    summary: titreRendezVous(rdv.type, gens.client.name),
    description: isVisio
      ? "Rendez-vous en visioconférence avec votre conseiller Horkos."
      : `Rendez-vous au cabinet Horkos.\n${CABINET_ADDRESS}`,
    startIso: rdv.date,
    durationMin: dureeRendezVous(rdv.type),
    attendees: [
      { email: gens.client.email, displayName: gens.client.name },
      ...(gens.advisor ? [{ email: gens.advisor.email, displayName: gens.advisor.name }] : []),
    ],
    location: isVisio ? undefined : CABINET_ADDRESS,
    withMeet: isVisio,
  });

  const meetingUrl = isVisio ? (event?.meetLink ?? null) : null;
  await supabase
    .from("appointments")
    .update({ calendar_event_id: event?.eventId ?? null, meeting_url: meetingUrl })
    .eq("id", rdv.id);

  await sendAppointmentEmails({
    appointmentId: rdv.id,
    slotIso: rdv.date,
    type: rdv.type,
    mode,
    meetingUrl,
    client: gens.client,
    advisor: {
      name: gens.advisor?.name ?? "votre conseiller",
      email: gens.advisor?.email ?? null,
    },
    motif,
  });
}

/**
 * Le cabinet annule : l'événement quitte les agendas, et le client est prévenu
 * si le rendez-vous était encore à venir - annuler après coup un rendez-vous
 * passé est du classement, pas une nouvelle à lui apprendre.
 */
export async function annulerEtPrevenir(input: {
  supabase: SupabaseServerClient;
  rdv: RendezVousANotifier;
}): Promise<void> {
  const { supabase, rdv } = input;
  if (rdv.calendar_event_id) await deleteAppointmentEvent(rdv.calendar_event_id);
  // Le lien Meet meurt avec l'événement : le laisser, c'est afficher partout un
  // « rejoindre » qui mène à une réunion supprimée.
  await supabase
    .from("appointments")
    .update({ calendar_event_id: null, meeting_url: null })
    .eq("id", rdv.id);

  if (new Date(rdv.date).getTime() <= Date.now()) return;

  const gens = await participants(supabase, rdv.client_id, rdv.advisor_id);
  if (!gens) return;

  await sendCancellationEmail({
    appointmentId: rdv.id,
    slotIso: rdv.date,
    type: rdv.type,
    client: gens.client,
  });
}
