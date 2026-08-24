"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, type ActionState } from "@/lib/staff";
import { DOCUMENT_CATEGORIES } from "@/lib/documents";

const SIGNED_URL_TTL_SECONDS = 60;

export interface OpenState {
  status: "idle" | "ready" | "error";
  url?: string;
  message?: string;
}

const attachSchema = z.object({
  clientId: z.uuid(),
  category: z.enum(DOCUMENT_CATEGORIES, { message: "Rubrique invalide." }),
  path: z.string().min(1, "Aucun fichier envoyé."),
  name: z.string().trim().min(1).max(255),
  size: z.coerce.number().int().nonnegative().optional(),
});

/** Journalise une consultation de pièce sensible (exigence AMMC). Jamais bloquant. */
async function logAccess(userId: string, documentId: string, action: string) {
  try {
    const supabase = await createClient();
    const forwarded = (await headers()).get("x-forwarded-for");
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      entity_type: "document",
      entity_id: documentId,
      ip_address: forwarded?.split(",")[0]?.trim() ?? null,
    });
  } catch {
    // Silencieux par conception.
  }
}

export async function attachDocument(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = attachSchema.safeParse({
    clientId: formData.get("clientId"),
    category: formData.get("category"),
    path: formData.get("doc_path"),
    name: formData.get("doc_name"),
    size: formData.get("doc_size") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const d = parsed.data;
  // Le chemin doit vivre sous le dossier du client : garde-fou contre une valeur
  // trafiquée qui rattacherait la pièce d'un autre client.
  if (!d.path.startsWith(`${d.clientId}/`)) {
    return { status: "error", message: "Chemin de fichier invalide." };
  }

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return { status: "error", message: "Seule l'équipe peut déposer un document." };

  const { error } = await supabase.from("documents").insert({
    client_id: d.clientId,
    category: d.category,
    name: d.name,
    file_path: d.path,
    file_size: d.size ?? null,
    uploaded_by: staff.id,
  });

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  revalidatePath(`/admin/clients/${d.clientId}/documents`);
  revalidatePath(`/admin/clients/${d.clientId}`);
  return { status: "success" };
}

export async function getStaffDocumentUrl(
  _previous: OpenState,
  formData: FormData
): Promise<OpenState> {
  const id = z.uuid().safeParse(formData.get("documentId"));
  if (!id.success) return { status: "error", message: "Document inconnu." };

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return { status: "error", message: "Accès réservé à l'équipe." };

  const { data: document } = await supabase
    .from("documents")
    .select("id, name, file_path")
    .eq("id", id.data)
    .maybeSingle();

  if (!document) return { status: "error", message: "Ce document n'est plus disponible." };

  const { data: signed, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.file_path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return { status: "error", message: "Impossible d'ouvrir ce document." };
  }

  await logAccess(staff.id, document.id, "document.view");
  return { status: "ready", url: signed.signedUrl };
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(formData.get("documentId"));
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  if (!id.success || !clientId.success) return;

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) return;

  const { data: document } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", id.data)
    .maybeSingle();

  if (document?.file_path) {
    await supabase.storage.from("documents").remove([document.file_path]);
  }
  await supabase.from("documents").delete().eq("id", id.data);

  revalidatePath(`/admin/clients/${clientId.data}/documents`);
  revalidatePath(`/admin/clients/${clientId.data}`);
}
