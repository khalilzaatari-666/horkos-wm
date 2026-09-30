import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * bookAndNotify orchestre trois systèmes dans un ordre contraint (voir le
 * commentaire de tête de booking.ts) :
 *   créer l'événement (client seul) → book_slot → compléter avec le conseiller
 *   → emails.
 * On mocke l'agenda, l'email et le RPC Supabase pour vérifier l'ordre et les
 * trois traitements d'échec distincts.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/google-calendar", () => ({
  createAppointmentEvent: vi.fn(),
  addEventAttendee: vi.fn(),
  deleteAppointmentEvent: vi.fn(),
}));
vi.mock("@/lib/email/appointment", () => ({
  sendAppointmentEmails: vi.fn(),
  sendCancellationEmail: vi.fn(),
}));
vi.mock("@/lib/email/recipients", () => ({
  advisorRecipient: vi.fn().mockResolvedValue({ name: "Amine Benali", email: "amine@horkos.co" }),
}));

import { bookAndNotify, inviterAuRendezVous, annulerEtPrevenir } from "./booking";
import {
  createAppointmentEvent,
  addEventAttendee,
  deleteAppointmentEvent,
} from "@/lib/google-calendar";
import { sendAppointmentEmails, sendCancellationEmail } from "@/lib/email/appointment";

const mockCreateEvent = vi.mocked(createAppointmentEvent);
const mockAddAttendee = vi.mocked(addEventAttendee);
const mockDeleteEvent = vi.mocked(deleteAppointmentEvent);
const mockEmails = vi.mocked(sendAppointmentEmails);
const mockCancelEmail = vi.mocked(sendCancellationEmail);

const SLOT = "2026-09-01T09:00:00+01:00";
const TOKEN = "11111111-1111-4111-8111-111111111111";

/** Ce que `book_slot` rend : conseiller assigné inclus. */
function bookResult(mode: "presentiel" | "visio") {
  return {
    appointment_id: "appt-1",
    slot_start: SLOT,
    mode,
    advisor_first_name: "Amine",
    advisor_last_name: "Benali",
    advisor_email: "amine@horkos.co",
  };
}

/** Un client Supabase minimal dont seul `rpc` est exercé. */
function supabaseWith(rpcResult: { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue(rpcResult),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const baseInput = {
  slotStart: SLOT,
  holdToken: TOKEN,
  type: "R0" as const,
  client: { name: "Jean Dupont", email: "jean@dupont.com" },
};

beforeEach(() => {
  mockCreateEvent.mockReset();
  mockAddAttendee.mockReset();
  mockDeleteEvent.mockReset();
  mockEmails.mockReset();
  mockCancelEmail.mockReset();
});

describe("visio - chemin nominal", () => {
  it("crée l'événement avec Meet AVANT de réserver, passe le lien à book_slot, puis rattache le conseiller et envoie les emails", async () => {
    mockCreateEvent.mockResolvedValue({ eventId: "evt-1", meetLink: "https://meet.google.com/abc" });
    const supabase = supabaseWith({ data: bookResult("visio"), error: null });

    const result = await bookAndNotify({ ...baseInput, supabase, mode: "visio" });

    // L'événement est créé avec Meet et le client seul en invité.
    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        withMeet: true,
        attendees: [{ email: "jean@dupont.com", displayName: "Jean Dupont" }],
      })
    );
    // book_slot reçoit le lien Meet et le mode.
    expect(supabase.rpc).toHaveBeenCalledWith(
      "book_slot",
      expect.objectContaining({
        p_slot_start: SLOT,
        p_token: TOKEN,
        p_mode: "visio",
        p_meeting_url: "https://meet.google.com/abc",
      })
    );
    // Le conseiller rejoint l'événement après coup.
    expect(mockAddAttendee).toHaveBeenCalledWith("evt-1", [
      { email: "amine@horkos.co", displayName: "Amine Benali" },
    ]);
    // Les emails partent, l'événement n'est pas supprimé.
    expect(mockEmails).toHaveBeenCalledOnce();
    expect(mockDeleteEvent).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });
});

describe("présentiel - chemin nominal", () => {
  it("crée l'événement sans Meet avec l'adresse du cabinet et réserve sans lien", async () => {
    mockCreateEvent.mockResolvedValue({ eventId: "evt-2", meetLink: null });
    const supabase = supabaseWith({ data: bookResult("presentiel"), error: null });

    await bookAndNotify({ ...baseInput, supabase, mode: "presentiel" });

    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ withMeet: false, location: expect.stringContaining("Casablanca") })
    );
    // Pas de lien de réunion pour un présentiel.
    expect(supabase.rpc).toHaveBeenCalledWith(
      "book_slot",
      expect.objectContaining({ p_mode: "presentiel", p_meeting_url: null })
    );
  });
});

describe("créneau déjà pris", () => {
  it("supprime l'événement orphelin et rend null sans envoyer d'email quand book_slot rend null", async () => {
    mockCreateEvent.mockResolvedValue({ eventId: "evt-3", meetLink: "https://meet.google.com/x" });
    const supabase = supabaseWith({ data: null, error: null });

    const result = await bookAndNotify({ ...baseInput, supabase, mode: "visio" });

    expect(result).toBeNull();
    expect(mockDeleteEvent).toHaveBeenCalledWith("evt-3");
    expect(mockEmails).not.toHaveBeenCalled();
    expect(mockAddAttendee).not.toHaveBeenCalled();
  });
});

describe("Google indisponible", () => {
  it("réserve quand même, sans lien ni invité conseiller, et envoie les emails", async () => {
    // L'agenda ne rend aucun événement.
    mockCreateEvent.mockResolvedValue(null);
    const supabase = supabaseWith({ data: bookResult("visio"), error: null });

    const result = await bookAndNotify({ ...baseInput, supabase, mode: "visio" });

    // book_slot est appelé avec un lien nul.
    expect(supabase.rpc).toHaveBeenCalledWith(
      "book_slot",
      expect.objectContaining({ p_meeting_url: null })
    );
    // Sans événement, personne à rattacher ni à supprimer.
    expect(mockAddAttendee).not.toHaveBeenCalled();
    expect(mockDeleteEvent).not.toHaveBeenCalled();
    // Le rendez-vous existe : les emails partent.
    expect(mockEmails).toHaveBeenCalledOnce();
    expect(result).not.toBeNull();
  });
});

/**
 * Un client Supabase pour les commandes du suivi : `profiles` rend le client,
 * `appointments.update` est enregistré pour qu'on vérifie ce qui a été rattaché.
 */
function supabaseSuivi() {
  const updates: unknown[] = [];
  const client = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            table === "profiles"
              ? { data: { first_name: "Jean", last_name: "Dupont", email: "jean@dupont.com" } }
              : { data: null },
        }),
      }),
      update: (values: unknown) => {
        updates.push(values);
        return { eq: async () => ({ error: null }) };
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { client, updates };
}

const rdvSuivi = {
  id: "appt-2",
  client_id: "client-1",
  advisor_id: "advisor-1",
  type: "R1",
  mode: "visio",
  date: "2099-01-05T10:00:00Z",
  calendar_event_id: "evt-ancien",
};

describe("inviterAuRendezVous - rendez-vous fixé par le cabinet", () => {
  it("remplace l'événement, invite client et conseiller avec Meet, rattache le lien et prévient", async () => {
    mockCreateEvent.mockResolvedValue({ eventId: "evt-neuf", meetLink: "https://meet.google.com/xyz" });
    const { client, updates } = supabaseSuivi();

    await inviterAuRendezVous({ supabase: client, rdv: rdvSuivi, motif: "deplace" });

    expect(mockDeleteEvent).toHaveBeenCalledWith("evt-ancien");
    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        withMeet: true,
        attendees: [
          { email: "jean@dupont.com", displayName: "Jean Dupont" },
          { email: "amine@horkos.co", displayName: "Amine Benali" },
        ],
      })
    );
    expect(updates).toContainEqual({
      calendar_event_id: "evt-neuf",
      meeting_url: "https://meet.google.com/xyz",
    });
    expect(mockEmails).toHaveBeenCalledWith(
      expect.objectContaining({ motif: "deplace", meetingUrl: "https://meet.google.com/xyz" })
    );
  });
});

describe("annulerEtPrevenir", () => {
  it("retire l'événement et prévient le client d'un rendez-vous à venir", async () => {
    const { client, updates } = supabaseSuivi();

    await annulerEtPrevenir({ supabase: client, rdv: rdvSuivi });

    expect(mockDeleteEvent).toHaveBeenCalledWith("evt-ancien");
    expect(updates).toContainEqual({ calendar_event_id: null, meeting_url: null });
    expect(mockCancelEmail).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: "appt-2", client: expect.objectContaining({ email: "jean@dupont.com" }) })
    );
  });

  it("n'écrit pas au client pour un rendez-vous déjà passé", async () => {
    const { client } = supabaseSuivi();

    await annulerEtPrevenir({
      supabase: client,
      rdv: { ...rdvSuivi, date: "2020-01-05T10:00:00Z", calendar_event_id: null },
    });

    expect(mockDeleteEvent).not.toHaveBeenCalled();
    expect(mockCancelEmail).not.toHaveBeenCalled();
  });
});
