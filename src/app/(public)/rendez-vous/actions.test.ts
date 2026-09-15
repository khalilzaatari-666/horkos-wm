import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * submitAppointmentRequest : la validation serveur est la seule qui compte, le
 * créneau est désormais OBLIGATOIRE, et le questionnaire n'est enregistré
 * QU'APRÈS une réservation réussie - jamais de demande sans rendez-vous. On
 * mocke Supabase et bookAndNotify pour isoler ces règles.
 */
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/booking", () => ({ bookAndNotify: vi.fn() }));
// La limitation de débit (server-only) est neutralisée ici : toujours autorisée.
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));

import { submitAppointmentRequest, emailHasAccount, type RdvState } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { bookAndNotify } from "@/lib/booking";

const mockCreateClient = vi.mocked(createClient);
const mockBook = vi.mocked(bookAndNotify);

const IDLE: RdvState = { status: "idle" };
const SLOT = "2026-09-01T09:00:00+01:00";
const TOKEN = "22222222-2222-4222-8222-222222222222";
const APPT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

let insertSpy: ReturnType<typeof vi.fn>;
let rpcSpy: ReturnType<typeof vi.fn>;

/**
 * Client Supabase mocké : `rpc` répond à email_has_account (adresse déjà
 * inscrite ?), `insert` enregistre le questionnaire.
 */
function stubSupabase({
  insertError = null,
  emailTaken = false,
}: { insertError?: unknown; emailTaken?: boolean } = {}) {
  insertSpy = vi.fn().mockResolvedValue({ error: insertError });
  rpcSpy = vi.fn().mockResolvedValue({ data: emailTaken, error: null });
  mockCreateClient.mockResolvedValue({
    from: vi.fn(() => ({ insert: insertSpy })),
    rpc: rpcSpy,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

/** Ce que rend `bookAndNotify` quand la réservation réussit. */
function booked() {
  return {
    appointment_id: APPT_ID,
    slot_start: SLOT,
    mode: "visio" as const,
    advisor_first_name: null,
    advisor_last_name: null,
    advisor_email: null,
  };
}

/** Un formulaire complet et valide, créneau compris ; `overrides` remplace des champs. */
function form(overrides: Record<string, string | string[] | null> = {}): FormData {
  const base: Record<string, string | string[]> = {
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean@dupont.com",
    phone: "+212 612345678",
    besoins: ["Préparer ma retraite"],
    patrimoine: "1M - 3M MAD",
    investissement: "1M - 3M MAD",
    ville: "Casablanca",
    source: "Recommandation",
    message: "",
    slotStart: SLOT,
    holdToken: TOKEN,
    mode: "visio",
    consentement: "on",
  };
  const merged = { ...base, ...overrides };
  const fd = new FormData();
  for (const [key, value] of Object.entries(merged)) {
    if (value === null) continue;
    if (Array.isArray(value)) value.forEach((v) => fd.append(key, v));
    else fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  mockCreateClient.mockReset();
  mockBook.mockReset();
});

describe("validation", () => {
  it("refuse une demande sans besoin, sans réserver", async () => {
    stubSupabase();
    const res = await submitAppointmentRequest(IDLE, form({ besoins: [] }));

    expect(res.status).toBe("error");
    expect(mockBook).not.toHaveBeenCalled();
  });

  it("exige la précision quand « Autre besoin » est coché", async () => {
    stubSupabase();
    const res = await submitAppointmentRequest(
      IDLE,
      form({ besoins: ["Autre besoin"], besoinAutre: "" })
    );

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/autre besoin/i);
  });

  it("refuse un numéro de téléphone invalide", async () => {
    stubSupabase();
    const res = await submitAppointmentRequest(IDLE, form({ phone: "12" }));

    expect(res.status).toBe("error");
    expect(mockBook).not.toHaveBeenCalled();
  });

  it("refuse une demande sans consentement, sans réserver", async () => {
    stubSupabase();
    const res = await submitAppointmentRequest(IDLE, form({ consentement: null }));

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/accepter/i);
    expect(mockBook).not.toHaveBeenCalled();
  });

  it("refuse une provenance hors liste et une ville vide", async () => {
    stubSupabase();
    const sansSource = await submitAppointmentRequest(IDLE, form({ source: "Bouche à oreille" }));
    const sansVille = await submitAppointmentRequest(IDLE, form({ ville: " " }));

    expect(sansSource.status).toBe("error");
    expect(sansVille.status).toBe("error");
    expect(mockBook).not.toHaveBeenCalled();
  });

  it("accepte « Je ne souhaite pas partager cette information » pour les montants", async () => {
    stubSupabase();
    mockBook.mockResolvedValue(booked());
    const refus = "Je ne souhaite pas partager cette information";

    const res = await submitAppointmentRequest(
      IDLE,
      form({ patrimoine: refus, investissement: refus })
    );

    expect(res.status).toBe("success");
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patrimoine: refus,
        investissement: refus,
        ville: "Casablanca",
        source: "Recommandation",
      })
    );
  });

  it("refuse une demande sans créneau - le slot est désormais obligatoire", async () => {
    stubSupabase();
    const res = await submitAppointmentRequest(
      IDLE,
      form({ slotStart: null, holdToken: null, mode: null })
    );

    expect(res.status).toBe("error");
    expect(mockBook).not.toHaveBeenCalled();
  });
});

describe("réservation obligatoire", () => {
  it("réserve d'abord, puis enregistre le questionnaire rattaché au rendez-vous", async () => {
    stubSupabase();
    mockBook.mockResolvedValue(booked());

    const res = await submitAppointmentRequest(IDLE, form());

    // La réservation part avec les bons paramètres.
    expect(mockBook).toHaveBeenCalledWith(
      expect.objectContaining({ slotStart: SLOT, holdToken: TOKEN, mode: "visio", type: "R0" })
    );
    // Le questionnaire est enregistré, rattaché au rendez-vous et déjà « planifie ».
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        appointment_id: APPT_ID,
        status: "planifie",
        first_name: "Jean",
      })
    );
    expect(res.status).toBe("success");
    expect(res.bookedSlot).toBe(SLOT);
  });

  it("n'enregistre AUCUNE demande quand le créneau vient d'être pris", async () => {
    stubSupabase();
    mockBook.mockResolvedValue(null);

    const res = await submitAppointmentRequest(IDLE, form());

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/vient d'être pris/i);
    // Pas de demande orpheline, sans rendez-vous.
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("confirme quand même si l'enregistrement du questionnaire échoue après réservation", async () => {
    // L'insert du questionnaire échoue, mais le rendez-vous, lui, est réservé.
    stubSupabase({ insertError: { message: "insert failed" } });
    mockBook.mockResolvedValue(booked());

    const res = await submitAppointmentRequest(IDLE, form());

    expect(res.status).toBe("success");
    expect(res.bookedSlot).toBe(SLOT);
  });
});

describe("adresse déjà inscrite", () => {
  it("refuse une adresse qui a déjà un compte, sans réserver ni enregistrer", async () => {
    stubSupabase({ emailTaken: true });
    mockBook.mockResolvedValue(booked());

    const res = await submitAppointmentRequest(IDLE, form());

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/déjà un espace client/i);
    // Vérifiée AVANT toute réservation ou écriture.
    expect(mockBook).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe("emailHasAccount (vérification à la volée du formulaire)", () => {
  it("renvoie true quand la RPC confirme un compte", async () => {
    stubSupabase({ emailTaken: true });
    expect(await emailHasAccount("jean@dupont.com")).toBe(true);
  });

  it("renvoie false pour une adresse invalide, sans interroger la base", async () => {
    stubSupabase();
    expect(await emailHasAccount("pas-un-email")).toBe(false);
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});
