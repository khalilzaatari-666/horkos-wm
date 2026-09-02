"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, type ActionState } from "@/lib/staff";

const SIGNED_URL_TTL_SECONDS = 60;

export interface AuditUrlState {
  status: "idle" | "ready" | "error";
  url?: string;
  message?: string;
}

const AUDIT_STATUS = ["en_cours", "termine"] as const;

async function logAccess(userId: string, auditId: string, action: string) {
  try {
    const supabase = await createClient();
    const forwarded = (await headers()).get("x-forwarded-for");
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      entity_type: "audit",
      entity_id: auditId,
      ip_address: forwarded?.split(",")[0]?.trim() ?? null,
    });
  } catch {
    // Silencieux par conception.
  }
}

const auditSchema = z.object({
  clientId: z.uuid(),
  status: z.enum(AUDIT_STATUS),
  // Chemin du PDF déposé (bucket privé), optionnel.
  path: z.string().optional(),
});

function revalidate(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/patrimoine`);
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function createAudit(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = auditSchema.safeParse({
    clientId: formData.get("clientId"),
    status: formData.get("status"),
    path: formData.get("doc_path") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const d = parsed.data;
  if (d.path && !d.path.startsWith(`${d.clientId}/`)) {
    return { status: "error", message: "Chemin de fichier invalide." };
  }

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return { status: "error", message: "Seule l'équipe peut ouvrir un audit." };

  const { error } = await supabase.from("audits").insert({
    client_id: d.clientId,
    advisor_id: staff.id,
    status: d.status,
    pdf_url: d.path ?? null,
  });

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidate(d.clientId);
  return { status: "success" };
}

export async function updateAudit(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "Audit introuvable." };

  const parsed = auditSchema.safeParse({
    clientId: formData.get("clientId"),
    status: formData.get("status"),
    path: formData.get("doc_path") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const d = parsed.data;
  if (d.path && !d.path.startsWith(`${d.clientId}/`)) {
    return { status: "error", message: "Chemin de fichier invalide." };
  }

  const supabase = await createClient();
  if (!(await requireStaff(supabase)))
    return { status: "error", message: "Seule l'équipe peut modifier un audit." };

  // Un champ PDF laissé vide ne doit pas effacer le rapport déjà en place : on ne
  // touche `pdf_url` que si un nouveau fichier a été déposé.
  const patch: Record<string, unknown> = {
    status: d.status,
    updated_at: new Date().toISOString(),
  };
  if (d.path) patch.pdf_url = d.path;

  const { error } = await supabase.from("audits").update(patch).eq("id", id.data);
  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidate(d.clientId);
  return { status: "success" };
}

export async function setAuditStatus(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  const status = z.enum(AUDIT_STATUS).safeParse(formData.get("status"));
  if (!id.success || !clientId.success || !status.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  await supabase
    .from("audits")
    .update({ status: status.data, updated_at: new Date().toISOString() })
    .eq("id", id.data);
  revalidate(clientId.data);
}

export async function deleteAudit(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("id"));
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  if (!id.success || !clientId.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  const { data: audit } = await supabase
    .from("audits")
    .select("pdf_url")
    .eq("id", id.data)
    .maybeSingle();

  // Retire le PDF du bucket privé seulement si `pdf_url` est bien un chemin de
  // stockage (préfixé par l'id du client), pas une éventuelle URL héritée.
  if (audit?.pdf_url && audit.pdf_url.startsWith(`${clientId.data}/`)) {
    await supabase.storage.from("documents").remove([audit.pdf_url]);
  }
  await supabase.from("audits").delete().eq("id", id.data);
  revalidate(clientId.data);
}

export async function getStaffAuditUrl(
  _previous: AuditUrlState,
  formData: FormData
): Promise<AuditUrlState> {
  const id = z.uuid().safeParse(formData.get("auditId"));
  if (!id.success) return { status: "error", message: "Audit inconnu." };

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return { status: "error", message: "Accès réservé à l'équipe." };

  const { data: audit } = await supabase
    .from("audits")
    .select("id, pdf_url")
    .eq("id", id.data)
    .maybeSingle();

  if (!audit?.pdf_url) return { status: "error", message: "Aucun rapport joint." };

  const { data: signed, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(audit.pdf_url, SIGNED_URL_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return { status: "error", message: "Impossible d'ouvrir le rapport." };
  }

  await logAccess(staff.id, audit.id, "audit.view");
  return { status: "ready", url: signed.signedUrl };
}
