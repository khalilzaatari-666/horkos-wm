import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * requestGuide : la page ne promet l'email que s'il est parti. Un guide sans
 * PDF n'est pas demandable, et un envoi refusé le dit au visiteur.
 */
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/email/guide", () => ({ sendGuideEmail: vi.fn() }));

import { requestGuide, type GuideRequestState } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { sendGuideEmail } from "@/lib/email/guide";

const mockCreateClient = vi.mocked(createClient);
const mockSend = vi.mocked(sendGuideEmail);

const IDLE: GuideRequestState = { status: "idle" };
const GUIDE_ID = "11111111-1111-4111-8111-111111111111";

let insertSpy: ReturnType<typeof vi.fn>;

function stubSupabase(guide: { id: string; title: string; pdf_url: string | null } | null) {
  insertSpy = vi.fn().mockResolvedValue({ error: null });
  const select = { eq: () => select, maybeSingle: async () => ({ data: guide }) };
  mockCreateClient.mockResolvedValue({
    from: vi.fn(() => ({ select: () => select, insert: insertSpy })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function form(): FormData {
  const fd = new FormData();
  fd.set("guideId", GUIDE_ID);
  fd.set("email", "visiteur@exemple.ma");
  return fd;
}

beforeEach(() => vi.clearAllMocks());

describe("requestGuide", () => {
  it("envoie le lien du PDF et confirme", async () => {
    stubSupabase({ id: GUIDE_ID, title: "Transmettre", pdf_url: "https://cdn.exemple/guide.pdf" });
    mockSend.mockResolvedValue(true);

    const res = await requestGuide(IDLE, form());

    expect(res.status).toBe("success");
    expect(mockSend).toHaveBeenCalledWith({
      email: "visiteur@exemple.ma",
      titre: "Transmettre",
      pdfUrl: "https://cdn.exemple/guide.pdf",
    });
  });

  it("refuse un guide publié sans PDF, sans rien enregistrer ni envoyer", async () => {
    stubSupabase({ id: GUIDE_ID, title: "Transmettre", pdf_url: null });

    const res = await requestGuide(IDLE, form());

    expect(res.status).toBe("error");
    expect(insertSpy).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("dit l'échec quand l'email n'est pas parti", async () => {
    stubSupabase({ id: GUIDE_ID, title: "Transmettre", pdf_url: "https://cdn.exemple/guide.pdf" });
    mockSend.mockResolvedValue(false);

    const res = await requestGuide(IDLE, form());

    expect(res.status).toBe("error");
    expect(res.message).toMatch(/échoué/);
  });
});
