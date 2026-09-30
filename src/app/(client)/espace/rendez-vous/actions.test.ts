import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * bookEspaceSlot : le client ne réserve que son R0. Une fois le R0 terminé, la
 * réservation est fermée - la suite se fixe avec le conseiller. On vérifie
 * cette fermeture, l'exigence de session et le passage à bookAndNotify.
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

/** Une liste : la chaîne se résout d'elle-même, sans `.maybeSingle()`. */
function liste(data: unknown[]) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    then: (resolve: (v: { data: unknown[] }) => unknown) => resolve({ data }),
  };
  return chain;
}

/**
 * Client Supabase configurable : présence d'un utilisateur, R0 existants,
 * profil renvoyé.
 */
function stubSupabase(opts: {
  user: { id: string; email?: string } | null;
  r0s?: { status: string; date: string }[];
  profile?: unknown;
}) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: opts.user } }) },
    from: vi.fn((table: string) =>
      table === "appointments" ? liste(opts.r0s ?? []) : query(opts.profile ?? null)
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

describe("réservation du R0", () => {
  it("réserve un R0 quand aucun R0 n'est tenu ni à venir", async () => {
    stubSupabase({
      user: { id: "u1", email: "u@x.co" },
      r0s: [{ status: "annule", date: "2099-01-01T10:00:00Z" }],
      profile: { email: "u@x.co" },
    });
    mockBook.mockResolvedValue(booked);

    const res = await bookEspaceSlot(IDLE, form());

    expect(mockBook).toHaveBeenCalledWith(expect.objectContaining({ type: "R0" }));
    expect(res.status).toBe("success");
    expect(res.bookedSlot).toBe(SLOT);
    expect(res.bookedMode).toBe("presentiel");
  });

  it("refuse de réserver quand un R0 est déjà terminé", async () => {
    stubSupabase({
      user: { id: "u1", email: "u@x.co" },
      r0s: [{ status: "termine", date: "2020-01-01T10:00:00Z" }],
      profile: { first_name: "Jean", last_name: "Dupont", email: "jean@x.co" },
    });

    const res = await bookEspaceSlot(IDLE, form());

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/votre conseiller vous contactera/);
    expect(mockBook).not.toHaveBeenCalled();
  });

  it("refuse un second R0 quand le premier est encore à venir", async () => {
    stubSupabase({
      user: { id: "u1", email: "u@x.co" },
      r0s: [{ status: "confirme", date: "2099-01-01T10:00:00Z" }],
      profile: { email: "u@x.co" },
    });

    const res = await bookEspaceSlot(IDLE, form());

    expect(res.message).toMatch(/déjà réservé/);
    expect(mockBook).not.toHaveBeenCalled();
  });
});

describe("créneau indisponible", () => {
  it("rend une erreur quand bookAndNotify échoue", async () => {
    stubSupabase({ user: { id: "u1", email: "u@x.co" }, profile: { email: "u@x.co" } });
    mockBook.mockResolvedValue(null);

    const res = await bookEspaceSlot(IDLE, form());

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/vient d'être pris/i);
  });
});
