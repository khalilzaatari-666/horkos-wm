import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * bookEspaceSlot : le type de rendez-vous n'est pas pris du formulaire mais
 * déduit du parcours — une « revue » si un R0 est déjà terminé, sinon un
 * « R0 ». On vérifie cette déduction, l'exigence de session et le passage à
 * bookAndNotify.
 */
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/booking", () => ({ bookAndNotify: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { bookEspaceSlot, type EspaceBookingState } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { bookAndNotify } from "@/lib/booking";

const mockCreateClient = vi.mocked(createClient);
const mockBook = vi.mocked(bookAndNotify);

const IDLE: EspaceBookingState = { status: "idle" };
const SLOT = "2026-09-01T09:00:00+01:00";
const TOKEN = "33333333-3333-4333-8333-333333333333";

/** Une chaîne de requête Supabase qui résout `{ data }` sur `.maybeSingle()`. */
function query(data: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve({ data }),
  };
  return chain;
}

/**
 * Client Supabase configurable : présence d'un utilisateur, existence d'un R0
 * terminé, profil renvoyé.
 */
function stubSupabase(opts: {
  user: { id: string; email?: string } | null;
  pastR0?: unknown;
  profile?: unknown;
}) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: opts.user } }) },
    from: vi.fn((table: string) =>
      query(table === "appointments" ? opts.pastR0 ?? null : opts.profile ?? null)
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function form(overrides: Record<string, string | null> = {}): FormData {
  const base: Record<string, string> = { slotStart: SLOT, holdToken: TOKEN, mode: "presentiel" };
  const merged = { ...base, ...overrides };
  const fd = new FormData();
  for (const [k, v] of Object.entries(merged)) if (v !== null) fd.set(k, v);
  return fd;
}

const booked = {
  appointment_id: "a1",
  slot_start: SLOT,
  mode: "presentiel" as const,
  advisor_first_name: "A",
  advisor_last_name: "B",
  advisor_email: "a@b.co",
};

beforeEach(() => {
  mockCreateClient.mockReset();
  mockBook.mockReset();
});

describe("session", () => {
  it("refuse si aucun utilisateur connecté", async () => {
    stubSupabase({ user: null });
    const res = await bookEspaceSlot(IDLE, form());

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/session/i);
    expect(mockBook).not.toHaveBeenCalled();
  });

  it("refuse un formulaire incomplet (mode manquant)", async () => {
    const res = await bookEspaceSlot(IDLE, form({ mode: null }));
    expect(res.status).toBe("error");
  });
});

describe("déduction du type de rendez-vous", () => {
  it("réserve un R0 quand aucun R0 n'est encore terminé", async () => {
    stubSupabase({ user: { id: "u1", email: "u@x.co" }, pastR0: null, profile: { email: "u@x.co" } });
    mockBook.mockResolvedValue(booked);

    const res = await bookEspaceSlot(IDLE, form());

    expect(mockBook).toHaveBeenCalledWith(expect.objectContaining({ type: "R0" }));
    expect(res.status).toBe("success");
    expect(res.bookedSlot).toBe(SLOT);
    expect(res.bookedMode).toBe("presentiel");
  });

  it("réserve une revue quand un R0 est déjà terminé", async () => {
    stubSupabase({
      user: { id: "u1", email: "u@x.co" },
      pastR0: { id: "old-r0" },
      profile: { first_name: "Jean", last_name: "Dupont", email: "jean@x.co" },
    });
    mockBook.mockResolvedValue(booked);

    await bookEspaceSlot(IDLE, form());

    expect(mockBook).toHaveBeenCalledWith(expect.objectContaining({ type: "revue" }));
  });
});

describe("créneau indisponible", () => {
  it("rend une erreur quand bookAndNotify échoue", async () => {
    stubSupabase({ user: { id: "u1", email: "u@x.co" }, pastR0: null, profile: { email: "u@x.co" } });
    mockBook.mockResolvedValue(null);

    const res = await bookEspaceSlot(IDLE, form());

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/vient d'être pris/i);
  });
});
