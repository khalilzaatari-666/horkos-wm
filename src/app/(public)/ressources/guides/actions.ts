"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export interface GuideRequestState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Never trust the client: the guide id and the email are re-checked here. */
const schema = z.object({
  guideId: z.uuid("Guide inconnu."),
  email: z.email("Veuillez entrer une adresse email valide.").max(200),
});

export async function requestGuide(
  _previous: GuideRequestState,
  formData: FormData
): Promise<GuideRequestState> {
  const parsed = schema.safeParse({
    guideId: formData.get("guideId"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  if (!(await rateLimit("guide", { max: 10, windowSeconds: 600 }))) {
    return {
      status: "error",
      message: "Trop de demandes envoyées. Merci de patienter quelques minutes avant de réessayer.",
    };
  }

  const supabase = await createClient();

  // Guard against an id for an unpublished (or deleted) guide.
  const { data: guide } = await supabase
    .from("guides")
    .select("id")
    .eq("id", parsed.data.guideId)
    .eq("is_published", true)
    .maybeSingle();

  if (!guide) {
    return { status: "error", message: "Ce guide n'est plus disponible." };
  }

  const { error } = await supabase
    .from("guide_downloads")
    .insert({ guide_id: parsed.data.guideId, email: parsed.data.email });

  if (error) {
    return { status: "error", message: "Une erreur est survenue. Veuillez réessayer." };
  }

  // TODO: envoyer le guide par email via Resend une fois le compte SMTP configuré.
  return {
    status: "success",
    message: "Merci, le guide vous sera envoyé par email.",
  };
}
