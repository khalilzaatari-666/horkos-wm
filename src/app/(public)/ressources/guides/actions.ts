"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendGuideEmail } from "@/lib/email/guide";

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
    .select("id, title, pdf_url")
    .eq("id", parsed.data.guideId)
    .eq("is_published", true)
    .maybeSingle();

  if (!guide) {
    return { status: "error", message: "Ce guide n'est plus disponible." };
  }
  // Un guide publié sans son PDF : rien à envoyer, donc rien à promettre.
  if (!guide.pdf_url) {
    return {
      status: "error",
      message: "Ce guide n'est pas encore disponible au téléchargement. Réessayez bientôt.",
    };
  }

  const { error } = await supabase
    .from("guide_downloads")
    .insert({ guide_id: parsed.data.guideId, email: parsed.data.email });

  if (error) {
    return { status: "error", message: "Une erreur est survenue. Veuillez réessayer." };
  }

  const envoye = await sendGuideEmail({
    email: parsed.data.email,
    titre: guide.title,
    pdfUrl: guide.pdf_url,
  });
  if (!envoye) {
    return {
      status: "error",
      message: "L'envoi du guide a échoué. Vérifiez votre adresse et réessayez dans un instant.",
    };
  }

  return {
    status: "success",
    message: "Merci, le guide vous sera envoyé par email.",
  };
}
