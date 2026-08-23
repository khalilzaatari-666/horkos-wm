"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface DownloadState {
  status: "idle" | "ready" | "error";
  url?: string;
  message?: string;
}

/** Durée de vie d'une URL signée. Assez pour cliquer, trop court pour circuler. */
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * Ouvre un document du coffre-fort.
 *
 * Le bucket est privé : rien n'est accessible sans une URL signée émise ici,
 * après vérification que le document appartient bien au demandeur. La double
 * barrière est volontaire - les policies RLS filtrent déjà, mais une erreur de
 * requête ne doit pas suffire à exposer une pièce patrimoniale.
 *
 * Chaque ouverture est journalisée dans `audit_logs` : c'est une consultation
 * de donnée sensible, et la traçabilité est une exigence AMMC.
 */
export async function getDocumentUrl(
  _previous: DownloadState,
  formData: FormData
): Promise<DownloadState> {
  const documentId = formData.get("documentId");
  if (typeof documentId !== "string" || !documentId) {
    return { status: "error", message: "Document inconnu." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Votre session a expiré. Reconnectez-vous." };
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id, name, file_path, client_id")
    .eq("id", documentId)
    .eq("client_id", user.id)
    .maybeSingle();

  if (!document) {
    return { status: "error", message: "Ce document n'est plus disponible." };
  }

  const { data: signed, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.file_path, SIGNED_URL_TTL_SECONDS, {
      download: document.name,
    });

  if (error || !signed?.signedUrl) {
    return {
      status: "error",
      message: "Impossible d'ouvrir ce document. Contactez votre conseiller.",
    };
  }

  await logAccess(user.id, document.id);

  return { status: "ready", url: signed.signedUrl };
}

/**
 * La journalisation ne doit jamais empêcher un client d'accéder à son document :
 * un échec d'écriture est avalé plutôt que remonté. La trace compte, mais pas au
 * prix du service.
 */
async function logAccess(userId: string, documentId: string) {
  try {
    const supabase = await createClient();
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "document.download",
      entity_type: "document",
      entity_id: documentId,
      // Derrière un proxy, la première adresse de la liste est celle du client.
      ip_address: forwarded?.split(",")[0]?.trim() ?? null,
    });
  } catch {
    // Silencieux par conception, voir le commentaire ci-dessus.
  }
}
