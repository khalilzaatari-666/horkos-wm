import "server-only";

import type { createClient } from "@/lib/supabase/server";
import {
  createAppointmentEvent,
  addEventAttendee,
  deleteAppointmentEvent,
} from "@/lib/google-calendar";
import { sendAppointmentEmails } from "@/lib/email/appointment";
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
