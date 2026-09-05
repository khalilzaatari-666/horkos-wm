"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, type ActionState } from "@/lib/staff";
import { peutAccederAuDossier } from "@/lib/client-access";
import { ficheAuditSchema, VERSION_FICHE } from "@/lib/fiche-audit/schema";
import { actifsDeLaFiche, reconcilier, type ActifExistant } from "@/lib/fiche-audit/assets";

const REFUS = "Ce dossier est piloté par son conseiller référent.";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function journaliser(
  supabase: Supabase,
  userId: string,
  auditId: string,
  action: string
) {
  try {
    const forwarded = (await headers()).get("x-forwarded-for");
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      entity_type: "audit",
      entity_id: auditId,
      ip_address: forwarded?.split(",")[0]?.trim() ?? null,
    });
  } catch {
    // Silencieux par conception : la traçabilité ne fait pas échouer l'acte.
  }
}

function revalidate(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/audits`, "layout");
  revalidatePath(`/admin/clients/${clientId}/patrimoine`);
  revalidatePath(`/admin/clients/${clientId}/suivi`);
  revalidatePath(`/admin/clients/${clientId}`);
  // Le patrimoine alimenté par la fiche est celui que le client voit.
  revalidatePath("/espace");
  revalidatePath("/espace/patrimoine");
}

/** L'appelant est-il de l'équipe, et pilote-t-il ce dossier ? */
async function autoriser(clientId: string) {
  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) return null;

  const { data: client } = await supabase
    .from("profiles")
    .select("advisor_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return null;

  if (!peutAccederAuDossier(staff, client.advisor_id)) return null;
  return { supabase, staff };
}

/**
 * Reverse les lignes de la fiche dans le patrimoine du client.
 *
 * Les actifs nés d'une fiche portent leur origine dans `details` ; ceux saisis à
 * la main dans l'onglet Patrimoine n'en ont pas et ne sont jamais touchés. Une
 * ligne retirée de la fiche retire son actif, sinon un bien vendu continuerait
 * d'être compté.
 *
 * Un échec ici n'annule pas l'enregistrement de la fiche : la saisie du
 * conseiller est ce qui compte, le patrimoine n'en est qu'une projection qu'un
 * nouvel enregistrement rétablira.
 */
async function synchroniserPatrimoine(
  supabase: Supabase,
  clientId: string,
  auditId: string,
  fiche: z.infer<typeof ficheAuditSchema>
): Promise<void> {
  const souhaites = actifsDeLaFiche(fiche);

  const { data: lignes } = await supabase
    .from("assets")
    .select("id, value, details")
    .eq("client_id", clientId)
    .eq("details->>audit_id", auditId);

  const existants: ActifExistant[] = (lignes ?? []).map((a) => ({
    id: a.id,
    cle: String((a.details as Record<string, unknown> | null)?.cle ?? ""),
    valeur: Number(a.value) || 0,
  }));

  const { aCreer, aMettreAJour, aSupprimer } = reconcilier(souhaites, existants);
  const valorises: { asset_id: string; value: number }[] = [];

  if (aCreer.length) {
    const { data: crees } = await supabase
      .from("assets")
      .insert(
        aCreer.map((a) => ({
          client_id: clientId,
          type: a.type,
          label: a.label,
          value: a.valeur,
          details: { audit_id: auditId, cle: a.cle },
        }))
      )
      .select("id, value");
    for (const c of crees ?? []) valorises.push({ asset_id: c.id, value: Number(c.value) || 0 });
  }

  for (const { existant, actif } of aMettreAJour) {
    await supabase
      .from("assets")
      .update({ type: actif.type, label: actif.label, value: actif.valeur })
      .eq("id", existant.id);
    valorises.push({ asset_id: existant.id, value: actif.valeur });
  }

  if (aSupprimer.length) {
    await supabase
      .from("assets")
      .delete()
      .in(
        "id",
        aSupprimer.map((a) => a.id)
      );
  }

  // Une valorisation datée par actif : c'est elle qui fait vivre l'indicateur
  // « Performance 12 mois ». L'index unique (asset_id, valued_at) fait qu'un
  // second enregistrement le même jour corrige la valeur au lieu d'en empiler
  // une seconde.
  if (valorises.length) {
    await supabase
      .from("asset_valuations")
      .upsert(
        valorises.map((v) => ({ ...v, valued_at: new Date().toISOString().slice(0, 10) })),
        { onConflict: "asset_id,valued_at" }
      );
  }
}

const enregistrerSchema = z.object({
  clientId: z.uuid(),
  auditId: z.uuid(),
  /** La fiche voyage en JSON : elle est trop imbriquée pour des champs plats. */
  fiche: z.string().max(200_000),
  terminer: z.boolean().default(false),
});

/**
 * Enregistre la fiche d'audit.
 *
 * La validation refaite ici n'est pas un doublon de celle du formulaire : le
 * navigateur poste ce qu'il veut, et ces montants finissent dans le patrimoine
 * que le client consulte.
 */
export async function enregistrerFiche(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = enregistrerSchema.safeParse({
    clientId: formData.get("clientId"),
    auditId: formData.get("auditId"),
    fiche: formData.get("fiche"),
    terminer: formData.get("terminer") === "1",
  });
  if (!parsed.success) return { status: "error", message: "Formulaire incomplet." };

  let brut: unknown;
  try {
    brut = JSON.parse(parsed.data.fiche);
  } catch {
    return { status: "error", message: "Fiche illisible. Rechargez la page." };
  }

  const fiche = ficheAuditSchema.safeParse(brut);
  if (!fiche.success) {
    const premier = fiche.error.issues[0];
    return {
      status: "error",
      message: `Saisie invalide (${premier.path.join(".") || "fiche"}) : ${premier.message}`,
    };
  }

  const allowed = await autoriser(parsed.data.clientId);
  if (!allowed) return { status: "error", message: REFUS };

  const { error } = await allowed.supabase
    .from("audits")
    .update({
      data: { ...fiche.data, version: VERSION_FICHE },
      status: parsed.data.terminer ? "termine" : "en_cours",
      updated_at: new Date().toISOString(),
      updated_by: allowed.staff.id,
    })
    .eq("id", parsed.data.auditId)
    // L'audit doit appartenir au client de l'URL : un id glané ailleurs ne
    // passe pas.
    .eq("client_id", parsed.data.clientId);

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  await synchroniserPatrimoine(
    allowed.supabase,
    parsed.data.clientId,
    parsed.data.auditId,
    fiche.data
  );
  await journaliser(
    allowed.supabase,
    allowed.staff.id,
    parsed.data.auditId,
    parsed.data.terminer ? "audit.termine" : "audit.enregistre"
  );
  revalidate(parsed.data.clientId);

  return { status: "success" };
}

const ouvrirSchema = z.object({
  clientId: z.uuid(),
  appointmentId: z.uuid().optional(),
});

export interface OuvertureState {
  status: "idle" | "error";
  message?: string;
  /** Id de la fiche à ouvrir, posé par le client après succès. */
  auditId?: string;
}

/**
 * Ouvre la fiche d'un rendez-vous, ou rend celle qui existe déjà.
 *
 * L'index unique sur `appointment_id` interdit deux fiches pour un même R0 ;
 * on relit donc avant d'insérer, et deux onglets ouverts sur le même
 * rendez-vous aboutissent à la même fiche plutôt qu'à une erreur.
 */
export async function ouvrirFiche(
  _previous: OuvertureState,
  formData: FormData
): Promise<OuvertureState> {
  const parsed = ouvrirSchema.safeParse({
    clientId: formData.get("clientId"),
    appointmentId: formData.get("appointmentId") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "Client inconnu." };

  const allowed = await autoriser(parsed.data.clientId);
  if (!allowed) return { status: "error", message: REFUS };

  if (parsed.data.appointmentId) {
    const { data: existante } = await allowed.supabase
      .from("audits")
      .select("id")
      .eq("client_id", parsed.data.clientId)
      .eq("appointment_id", parsed.data.appointmentId)
      .maybeSingle();
    if (existante) return { status: "idle", auditId: existante.id };
  }

  const { data: cree, error } = await allowed.supabase
    .from("audits")
    .insert({
      client_id: parsed.data.clientId,
      advisor_id: allowed.staff.id,
      appointment_id: parsed.data.appointmentId ?? null,
      status: "en_cours",
      data: {},
      updated_by: allowed.staff.id,
    })
    .select("id")
    .maybeSingle();

  if (error || !cree) return { status: "error", message: "Ouverture impossible. Réessayez." };

  await journaliser(allowed.supabase, allowed.staff.id, cree.id, "audit.ouvert");
  revalidate(parsed.data.clientId);
  return { status: "idle", auditId: cree.id };
}
