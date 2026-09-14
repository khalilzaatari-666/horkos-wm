import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * submitPartenariat : la validation serveur est la seule qui compte, chaque
 * catégorie a ses champs obligatoires, la limitation de débit passe avant
 * l'insertion, et les champs spécifiques sont repliés dans `message` (la table
 * n'a pas une colonne par champ). Supabase, l'email et le rate limit sont mockés.
 */
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/email/partenariat", () => ({ sendPartenariatNotification: vi.fn() }));

import { submitPartenariat, type PartenariatState } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendPartenariatNotification } from "@/lib/email/partenariat";

const mockCreateClient = vi.mocked(createClient);
const mockRateLimit = vi.mocked(rateLimit);
const mockNotify = vi.mocked(sendPartenariatNotification);

const IDLE: PartenariatState = { status: "idle" };

let insertSpy: ReturnType<typeof vi.fn>;

function stubSupabase({ insertError = null }: { insertError?: unknown } = {}) {
  insertSpy = vi.fn().mockResolvedValue({ error: insertError });
  mockCreateClient.mockResolvedValue({
    from: vi.fn(() => ({ insert: insertSpy })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

const commun = {
  name: "Sara Alaoui",
  company: "Atlas Capital",
  email: "sara@atlas.ma",
  phone: "+212 612345678",
  description: "",
};

/** Un formulaire « immo » complet ; `overrides` remplace ou retire (null) des champs. */
function form(overrides: Record<string, string | null> = {}): FormData {
  const base: Record<string, string> = {
    category: "immo",
    ...commun,
    typeBien: "Local commercial",
    localisation: "Casablanca, Maarif",
    prix: "5000000",
    rendement: "6.5",
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value !== null) fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  mockCreateClient.mockReset();
  mockNotify.mockReset();
  mockRateLimit.mockReset();
  mockRateLimit.mockResolvedValue(true);
});

describe("validation", () => {
  it("refuse une catégorie inconnue", async () => {
    stubSupabase();
    const res = await submitPartenariat(IDLE, form({ category: "banque" }));
    expect(res.status).toBe("error");
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("exige les champs propres à la catégorie", async () => {
    stubSupabase();
    const res = await submitPartenariat(IDLE, form({ prix: null }));
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/prix de vente/i);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("refuse une option hors liste", async () => {
    stubSupabase();
    const res = await submitPartenariat(IDLE, form({ typeBien: "Château" }));
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/type de bien/i);
  });

  it("borne les pourcentages à 100", async () => {
    stubSupabase();
    const res = await submitPartenariat(IDLE, form({ rendement: "150" }));
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/100/);
  });

  it("refuse un numéro de téléphone invalide", async () => {
    stubSupabase();
    const res = await submitPartenariat(IDLE, form({ phone: "12" }));
    expect(res.status).toBe("error");
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("ignore les champs d'une autre catégorie", async () => {
    stubSupabase();
    // Un champ « club » glissé dans un envoi « immo » n'est ni requis ni conservé.
    const res = await submitPartenariat(IDLE, form({ coInvestisseurs: "3" }));
    expect(res.status).toBe("success");
    const row = insertSpy.mock.calls[0][0];
    expect(row.message).not.toMatch(/co-investisseurs/i);
  });
});

describe("limitation de débit", () => {
  it("bloque avant d'insérer quand la limite est atteinte", async () => {
    stubSupabase();
    mockRateLimit.mockResolvedValue(false);

    const res = await submitPartenariat(IDLE, form());

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/patienter/i);
    expect(insertSpy).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("n'est consultée qu'après une validation réussie", async () => {
    stubSupabase();
    await submitPartenariat(IDLE, form({ email: "pas-un-email" }));
    expect(mockRateLimit).not.toHaveBeenCalled();
  });
});

describe("enregistrement", () => {
  it("écrit le libellé de catégorie et replie les détails dans message", async () => {
    stubSupabase();

    const res = await submitPartenariat(IDLE, form({ description: "Vue mer." }));

    expect(res.status).toBe("success");
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Sara Alaoui",
        company: "Atlas Capital",
        email: "sara@atlas.ma",
        phone: "+212 612345678",
        partner_type: "Agent immobilier",
        status: "nouveau",
      })
    );
    const message: string = insertSpy.mock.calls[0][0].message;
    expect(message).toContain("Type de bien : Local commercial");
    expect(message).toContain("Localisation : Casablanca, Maarif");
    expect(message).toMatch(/Prix de vente : 5.000.000/);
    expect(message).toContain("Rendement locatif estimé : 6,5 %");
    expect(message).toContain("Description complémentaire : Vue mer.");

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ partnerType: "Agent immobilier", company: "Atlas Capital" })
    );
  });

  it("accepte chaque catégorie avec ses champs", async () => {
    stubSupabase();
    const cas: Record<string, string>[] = [
      { category: "gestion", typeFonds: "OPCVM actions", encours: "50000000", frais: "1.5", performance: "Performance annualisée de 8 % sur 5 ans." },
      { category: "assureur", typeProduit: "Prévoyance patrimoniale", frais: "0.8", fondsDirhams: "Oui", specificites: "Contrat multisupport avec garantie plancher." },
      { category: "fonds", typeLevee: "Venture Capital", stade: "Série A", secteur: "Fintech", montantRecherche: "10000000", ticketMinimum: "500000" },
      { category: "club", nature: "Club deal immobilier", montant: "20000000", coInvestisseurs: "5" },
    ];
    for (const c of cas) {
      const fd = new FormData();
      for (const [k, v] of Object.entries({ ...commun, ...c })) fd.set(k, v);
      const res = await submitPartenariat(IDLE, fd);
      expect(res.status, c.category).toBe("success");
    }
    expect(insertSpy).toHaveBeenCalledTimes(4);
  });

  it("remonte une erreur générique si l'insertion échoue, sans notifier", async () => {
    stubSupabase({ insertError: { message: "boom" } });

    const res = await submitPartenariat(IDLE, form());

    expect(res.status).toBe("error");
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
