"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface AuditReportState {
  status: "idle" | "ready" | "error";
  url?: string;
  message?: string;
}

const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Ouvre le rapport d'audit du client via une URL signée d'une minute.
 *
 * Le PDF vit dans le bucket PRIVÉ `documents` (déposé par le conseiller) :
 * `pdf_url` en porte le chemin, jamais une URL publique. On vérifie que l'audit
 * appartient bien au demandeur, on signe, et on journalise la consultation -
 * même exigence de traçabilité que pour le coffre-fort.
 */
export async function getAuditReportUrl(
  _previous: AuditReportState,
  formData: FormData
): Promise<AuditReportState> {
  const auditId = formData.get("auditId");
  if (typeof auditId !== "string" || !auditId) {
    return { status: "error", message: "Audit inconnu." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Votre session a expiré. Reconnectez-vous." };

  const { data: audit } = await supabase
    .from("audits")
    .select("id, pdf_url")
    .eq("id", auditId)
    .eq("client_id", user.id)
    .maybeSingle();

  if (!audit?.pdf_url) return { status: "error", message: "Aucun rapport disponible." };

  const { data: signed, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(audit.pdf_url, SIGNED_URL_TTL_SECONDS, { download: "rapport-audit.pdf" });

  if (error || !signed?.signedUrl) {
    return { status: "error", message: "Impossible d'ouvrir le rapport. Contactez votre conseiller." };
  }

  try {
    const forwarded = (await headers()).get("x-forwarded-for");
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "audit.download",
      entity_type: "audit",
      entity_id: audit.id,
      ip_address: forwarded?.split(",")[0]?.trim() ?? null,
    });
  } catch {
    // La trace ne doit pas empêcher l'accès : échec avalé.
  }

  return { status: "ready", url: signed.signedUrl };
}
