import { describe, it, expect } from "vitest";
import { requireDossier } from "./staff";

/** Un client Supabase qui rend l'utilisateur, son rôle, puis le référent du client. */
function stub(role: string, advisorId: string | null) {
  const profils: Record<string, unknown> = {
    moi: { role },
    client: { advisor_id: advisorId },
  };
  return {
    auth: { getUser: async () => ({ data: { user: { id: "moi" } } }) },
    from: () => {
      let id = "";
      const chain = {
        select: () => chain,
        eq: (_col: string, v: string) => ((id = v), chain),
        maybeSingle: async () => ({ data: profils[id] ?? null }),
      };
      return chain;
    },
  } as unknown as Parameters<typeof requireDossier>[0];
}

describe("requireDossier", () => {
  it("laisse le conseiller sur son client et sur un client sans référent", async () => {
    expect(await requireDossier(stub("conseiller", "moi"), "client")).toEqual({ id: "moi", role: "conseiller" });
    expect(await requireDossier(stub("conseiller", null), "client")).not.toBeNull();
  });

  it("refuse le conseiller sur le client d'un confrère, pas l'admin", async () => {
    expect(await requireDossier(stub("conseiller", "autre"), "client")).toBeNull();
    expect(await requireDossier(stub("admin", "autre"), "client")).not.toBeNull();
  });

  it("refuse un client, et un dossier introuvable", async () => {
    expect(await requireDossier(stub("client", null), "client")).toBeNull();
    expect(await requireDossier(stub("conseiller", null), "inconnu")).toBeNull();
  });
});
