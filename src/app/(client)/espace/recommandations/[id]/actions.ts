"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendRecommendationQuestion } from "@/lib/email/recommandation-question";
import { assignmentStatusLabel } from "@/lib/recommandation-status";

export interface EchangeState {
  status: "idle" | "success" | "error";
  message?: string;
}

/**
 * Prévient le conseiller qu'un client veut parler d'une recommandation.
 *
 * L'attribution est relue côté serveur : c'est elle qui prouve que la
 * recommandation a bien été adressée à ce client. Sans ce contrôle, l'action
 * enverrait une alerte sur n'importe quelle fiche dont on devine l'identifiant,
 * exactement ce que la page prend soin d'empêcher à l'affichage.
 */
export async function demanderEchange(
  _previous: EchangeState,
  formData: FormData
): Promise<EchangeState> {
  const parsed = z.uuid().safeParse(formData.get("recommendationId"));
  if (!parsed.success) return { status: "error", message: "Recommandation inconnue." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Votre session a expiré. Reconnectez-vous." };

  // Un clic répété ne doit pas se transformer en rafale d'emails chez le
  // conseiller. La fenêtre est large : la demande n'a de sens qu'une fois.
  if (!(await rateLimit("reco-echange", { max: 3, windowSeconds: 600 }))) {
    return {
      status: "error",
      message: "Demande déjà envoyée. Votre conseiller revient vers vous.",
    };
  }

  const [{ data: attribution }, { data: profile }] = await Promise.all([
    supabase
      .from("client_recommendations")
      .select("status, recommendations(id, title, category)")
      .eq("client_id", user.id)
      .eq("recommendation_id", parsed.data)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, last_name, email, phone, advisor_id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const reco = Array.isArray(attribution?.recommendations)
    ? attribution?.recommendations[0]
    : attribution?.recommendations;

  if (!attribution || !reco) {
    return { status: "error", message: "Recommandation introuvable." };
  }

  // La trace d'abord, l'email ensuite : c'est la ligne en base qui garantit
  // qu'une demande ne se perd pas, l'email n'étant qu'une notification. Son
  // échec reste non bloquant pour le client, comme celui de l'envoi.
  const { error: traceError } = await supabase.from("advisor_requests").insert({
    client_id: user.id,
    advisor_id: profile?.advisor_id ?? null,
    recommendation_id: reco.id,
  });
  if (traceError) {
    console.error("[reco] demande d'échange non enregistrée:", traceError.message);
  }

  await sendRecommendationQuestion({
    clientId: user.id,
    client: {
      name:
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        (profile?.email ?? user.email ?? "Client"),
      email: profile?.email ?? user.email ?? "",
      phone: profile?.phone ?? null,
    },
    advisorId: profile?.advisor_id ?? null,
    recommendation: {
      id: reco.id,
      title: reco.title,
      category: reco.category ?? null,
      statusLabel: assignmentStatusLabel(attribution.status),
    },
  });

  // L'envoi ne remonte jamais d'échec (contrat des alertes) : le client est
  // remercié dans tous les cas, et un email perdu se voit dans les logs.
  return { status: "success" };
}
