import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Le formulaire des lecteurs : rien ne s'ouvre sans un code SMS correct, et
 * un code correct pose le cookie puis envoie le contenu par email.
 */
const cookieSet = vi.fn();
vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(true),
  clientIp: vi.fn().mockResolvedValue("203.0.113.7"),
}));
vi.mock("@/lib/sms", () => ({ sendCode: vi.fn(), checkCode: vi.fn(), smsActif: vi.fn() }));
vi.mock("@/lib/email/guide", () => ({ sendGuideEmail: vi.fn(), sendArticleEmail: vi.fn() }));
vi.mock("@/lib/lecteur", () => ({ LECTEUR_COOKIE: "horkos_lecteur", LECTEUR_MAX_AGE: 31536000 }));

import { demanderCode, verifierCode, type DemandeCode } from "./lecteur-actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { sendCode, checkCode, smsActif } from "@/lib/sms";
import { sendGuideEmail } from "@/lib/email/guide";

const LEAD_ID = "22222222-2222-4222-8222-222222222222";
const GUIDE_ID = "11111111-1111-4111-8111-111111111111";

/** Une base minimale : chaque table rend la ligne qu'on lui donne. */
function stubDb(rows: Record<string, unknown>) {
  const inserts: Record<string, unknown[]> = {};
  const updates: Record<string, unknown[]> = {};
  const from = vi.fn((table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({ data: rows[table] ?? null }),
      single: async () => ({ data: rows[table] ?? null, error: null }),
      insert: (v: unknown) => {
        (inserts[table] ??= []).push(v);
        return chain;
      },
      update: (v: unknown) => {
        (updates[table] ??= []).push(v);
        return chain;
      },
    };
    return chain;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createAdminClient).mockReturnValue({ from } as any);
  return { inserts, updates };
}

const demande = (over: Partial<DemandeCode> = {}): DemandeCode => ({
  firstName: "Salma",
  lastName: "Alaoui",
  email: "salma@exemple.ma",
  phone: "+212 612345678",
  consent: true,
  sourceType: "guide",
  sourceId: GUIDE_ID,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rateLimit).mockResolvedValue(true);
  vi.mocked(smsActif).mockReturnValue(true);
});

describe("demanderCode", () => {
  it("enregistre le lecteur et envoie le code", async () => {
    const db = stubDb({ guides: { id: GUIDE_ID }, content_leads: { id: LEAD_ID } });
    vi.mocked(sendCode).mockResolvedValue(true);

    const res = await demanderCode(demande());

    expect(res).toEqual({ ok: true, ouvert: false, leadId: LEAD_ID });
    expect(sendCode).toHaveBeenCalledWith("+212 612345678");
    expect(db.inserts.content_leads?.[0]).toMatchObject({ email: "salma@exemple.ma", source_type: "guide", ip: "203.0.113.7", verified_at: null });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("sans Twilio, ouvre tout de suite : fiche ouverte, cookie, guide envoyé, aucun SMS", async () => {
    vi.mocked(smsActif).mockReturnValue(false);
    const db = stubDb({ guides: { id: GUIDE_ID, title: "Transmettre", pdf_url: "https://cdn.exemple/g.pdf" }, content_leads: { id: LEAD_ID } });
    vi.mocked(sendGuideEmail).mockResolvedValue(true);

    const res = await demanderCode(demande());

    expect(res).toEqual({ ok: true, ouvert: true, emailSent: true });
    expect(sendCode).not.toHaveBeenCalled();
    expect(db.inserts.content_leads?.[0]).toMatchObject({ verified_at: expect.any(String) });
    expect(db.inserts.content_leads?.[0]).not.toHaveProperty("phone_verified", true);
    expect(cookieSet).toHaveBeenCalledWith("horkos_lecteur", LEAD_ID, expect.objectContaining({ httpOnly: true }));
  });

  it("refuse sans consentement, sans rien enregistrer", async () => {
    const db = stubDb({ guides: { id: GUIDE_ID } });
    const res = await demanderCode(demande({ consent: false as true }));
    expect(res.ok).toBe(false);
    expect(db.inserts.content_leads).toBeUndefined();
    expect(sendCode).not.toHaveBeenCalled();
  });

  it("refuse un numéro invalide", async () => {
    stubDb({ guides: { id: GUIDE_ID } });
    const res = await demanderCode(demande({ phone: "+212 12" }));
    expect(res.ok).toBe(false);
  });

  it("refuse un contenu inconnu ou non publié", async () => {
    stubDb({});
    const res = await demanderCode(demande());
    expect(res).toEqual({ ok: false, message: "Ce contenu n'est plus disponible." });
  });

  it("bloque au-delà de la limite d'envois", async () => {
    stubDb({ guides: { id: GUIDE_ID } });
    vi.mocked(rateLimit).mockResolvedValue(false);
    const res = await demanderCode(demande());
    expect(res.ok).toBe(false);
    expect(sendCode).not.toHaveBeenCalled();
  });
});

describe("verifierCode", () => {
  const lead = { id: LEAD_ID, email: "salma@exemple.ma", phone: "+212 612345678", source_type: "guide", source_id: GUIDE_ID, verified_at: null };

  it("un bon code vérifie la fiche, pose le cookie et envoie le guide", async () => {
    const db = stubDb({ content_leads: lead, guides: { title: "Transmettre", pdf_url: "https://cdn.exemple/g.pdf" } });
    vi.mocked(checkCode).mockResolvedValue(true);
    vi.mocked(sendGuideEmail).mockResolvedValue(true);

    const res = await verifierCode(LEAD_ID, "123456");

    expect(res).toEqual({ ok: true, emailSent: true });
    expect(db.updates.content_leads?.[0]).toMatchObject({ phone_verified: true });
    expect(cookieSet).toHaveBeenCalledWith("horkos_lecteur", LEAD_ID, expect.objectContaining({ httpOnly: true }));
    expect(db.inserts.guide_downloads?.[0]).toEqual({ guide_id: GUIDE_ID, email: "salma@exemple.ma" });
  });

  it("un mauvais code ne pose rien", async () => {
    const db = stubDb({ content_leads: lead });
    vi.mocked(checkCode).mockResolvedValue(false);

    const res = await verifierCode(LEAD_ID, "000001");

    expect(res.ok).toBe(false);
    expect(cookieSet).not.toHaveBeenCalled();
    expect(db.updates.content_leads).toBeUndefined();
  });

  it("refuse un code mal formé sans interroger Twilio", async () => {
    stubDb({ content_leads: lead });
    const res = await verifierCode(LEAD_ID, "12ab");
    expect(res.ok).toBe(false);
    expect(checkCode).not.toHaveBeenCalled();
  });

  it("déverrouille même si l'email échoue, en le signalant", async () => {
    stubDb({ content_leads: lead, guides: { title: "Transmettre", pdf_url: "https://cdn.exemple/g.pdf" } });
    vi.mocked(checkCode).mockResolvedValue(true);
    vi.mocked(sendGuideEmail).mockResolvedValue(false);

    const res = await verifierCode(LEAD_ID, "123456");

    expect(res).toEqual({ ok: true, emailSent: false });
    expect(cookieSet).toHaveBeenCalled();
  });
});
