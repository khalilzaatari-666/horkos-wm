"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  revalidatePath(`/admin/clients/${clientId}`, "layout");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/rendez-vous");
  revalidatePath("/espace/accompagnement");
  // Le patrimoine alimenté par la fiche est celui que le client voit.
  revalidatePath("/espace");
  revalidatePath("/espace/patrimoine");
}

/**
 * La fiche close atteste que l'audit a eu lieu : son R0, s'il est encore posé
 * et commencé, passe « terminé ». Sans quoi le suivi le croirait toujours à
 * clore, proposerait de relancer le client pour un R0, et n'ouvrirait pas la
 * relance du R1.
 */
async function cloreLeR0(supabase: Supabase, clientId: string, auditId: string) {
  const { data: audit } = await supabase
    .from("audits")
    .select("appointment_id")
    .eq("id", auditId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!audit?.appointment_id) return;

  await supabase
    .from("appointments")
    .update({ status: "termine" })
    .eq("id", audit.appointment_id)
    .eq("client_id", clientId)
    .in("status", ["planifie", "confirme"])
    .lte("date", new Date().toISOString());
}

/**
 * Un compte sans nom ni téléphone (inscription par code, profil jamais
 * complété) reprend ceux de la fiche : sinon le dossier reste « Client sans
 * nom ». Seuls les champs vides du compte sont remplis ; ailleurs, c'est le
 * compte qui fait autorité sur la fiche.
 *
 * Clé de service : la RLS ne laisse que l'admin écrire sur `profiles`, et
 * l'accès du conseiller à ce dossier vient d'être vérifié.
 */
async function completerLeCompte(
  clientId: string,
  titulaire: { nom?: string; prenom?: string; telephone?: string }
) {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: compte } = await admin
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", clientId)
    .eq("role", "client")
    .maybeSingle();
  if (!compte) return;

  const complement: Record<string, string> = {};
  const champs: [keyof typeof compte, string | undefined][] = [
    ["first_name", titulaire.prenom],
    ["last_name", titulaire.nom],
    ["phone", titulaire.telephone],
  ];
  for (const [colonne, valeur] of champs) {
    if (valeur?.trim() && !(compte[colonne] as string | null)?.trim()) {
      complement[colonne] = valeur.trim();
    }
  }
  if (Object.keys(complement).length === 0) return;

  await admin.from("profiles").update(complement).eq("id", clientId).eq("role", "client");
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
      // Enregistrer, c'est clore : la fiche n'a qu'un bouton, et « Modifier »
      // depuis la liste des audits la rouvre en édition sans changer son statut.
      status: "termine",
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
  await cloreLeR0(allowed.supabase, parsed.data.clientId, parsed.data.auditId);
  await completerLeCompte(parsed.data.clientId, fiche.data.titulaire);
  await journaliser(
    allowed.supabase,
    allowed.staff.id,
    parsed.data.auditId,
    "audit.termine"
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

    // Même règle que la carte du suivi : le rendez-vous est bien celui de ce
    // client, il n'est pas annulé, et il a commencé.
    const { data: rdv } = await allowed.supabase
      .from("appointments")
      .select("status, date")
      .eq("id", parsed.data.appointmentId)
      .eq("client_id", parsed.data.clientId)
      .maybeSingle();
    if (!rdv || rdv.status === "annule") {
      return { status: "error", message: "Ce rendez-vous n'ouvre pas de fiche d'audit." };
    }
    if (new Date(rdv.date).getTime() > Date.now()) {
      return { status: "error", message: "La fiche s'ouvre à l'heure du rendez-vous." };
    }
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
