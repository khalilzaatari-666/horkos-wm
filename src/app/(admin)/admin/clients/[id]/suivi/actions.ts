"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, type ActionState } from "@/lib/staff";
import { peutAccederAuDossier } from "@/lib/client-access";
import { cabinetLocalToIso } from "@/lib/cabinet-time";
import { jalonSuivant } from "@/lib/parcours";
import { echeance, QUANTITE_MAX, UNITES } from "@/lib/rappels";

/** Les statuts qu'une commande du suivi peut poser. */
const STATUTS = ["confirme", "termine", "annule"] as const;

const REFUS = "Ce dossier est piloté par son conseiller référent.";

async function journaliser(userId: string, appointmentId: string, action: string) {
  try {
    const supabase = await createClient();
    const forwarded = (await headers()).get("x-forwarded-for");
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      entity_type: "appointment",
      entity_id: appointmentId,
      ip_address: forwarded?.split(",")[0]?.trim() ?? null,
    });
  } catch {
    // Silencieux par conception : la traçabilité ne doit pas faire échouer
    // l'acte qu'elle enregistre.
  }
}

function revalidate(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/suivi`);
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/rendez-vous");
  // Le client voit le même parcours de son côté.
  revalidatePath("/espace");
  revalidatePath("/espace/accompagnement");
}

/**
 * Contrôle commun aux deux commandes : l'appelant est-il de l'équipe, et
 * pilote-t-il bien ce dossier ?
 *
 * La RLS laisse toute l'équipe écrire sur `appointments` ; c'est donc ici que
 * la règle de `client-access` s'applique réellement, pas seulement à l'affichage.
 */
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
  return { supabase, staff, advisorId: client.advisor_id as string | null };
}

/**
 * Annuler, marquer terminé, rétablir. Une seule commande : ce sont trois
 * écritures du même champ, et les distinguer n'apporterait que des copies.
 *
 * Le rendez-vous est mis à jour par son id ET son client : un id volé sur un
 * autre dossier ne passerait pas le filtre.
 */
export async function setAppointmentStatus(formData: FormData): Promise<void> {
  const parsed = z
    .object({
      id: z.uuid(),
      clientId: z.uuid(),
      status: z.enum(STATUTS),
    })
    .safeParse({
      id: formData.get("id"),
      clientId: formData.get("clientId"),
      status: formData.get("status"),
    });
  if (!parsed.success) return;

  const allowed = await autoriser(parsed.data.clientId);
  if (!allowed) return;

  const { error } = await allowed.supabase
    .from("appointments")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("client_id", parsed.data.clientId);
  if (error) return;

  await journaliser(allowed.staff.id, parsed.data.id, `appointment.${parsed.data.status}`);
  revalidate(parsed.data.clientId);
}

const planifierSchema = z.object({
  clientId: z.uuid(),
  type: z.enum(["R1", "R2"]),
  // `datetime-local` : heure du cabinet, sans fuseau.
  quand: z.string(),
  mode: z.enum(["presentiel", "visio"]),
  notes: z.string().max(2000).optional(),
  /**
   * Rendez-vous à clore en même temps : c'est le fait de convenir de la suite
   * qui atteste que le précédent a eu lieu. Rien ne le prouverait autrement, et
   * un « Marquer terminé » séparé finit par ne jamais être cliqué - le taux
   * d'honorés s'en trouve alors faux.
   */
  terminerId: z.uuid().optional(),
});

/**
 * Pose l'étape suivante du parcours.
 *
 * Le type n'est pas cru sur parole : on relit les rendez-vous du client et on
 * vérifie que l'étape demandée est bien celle que `jalonSuivant` autorise. Un
 * formulaire trafiqué ne peut donc pas convoquer un R2 avant le R1, ni doubler
 * une étape déjà planifiée.
 *
 * L'insertion est directe, sans passer par `book_slot` : ce RPC réserve un
 * créneau ouvert au nom de l'utilisateur connecté, ce qu'un conseiller agissant
 * pour un client n'est pas. En contrepartie, ni événement d'agenda ni email ne
 * part d'ici - le conseiller convient de l'heure avec son client.
 */
export async function planifierEtape(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = planifierSchema.safeParse({
    clientId: formData.get("clientId"),
    type: formData.get("type"),
    quand: formData.get("quand"),
    mode: formData.get("mode"),
    notes: formData.get("notes") || undefined,
    terminerId: formData.get("terminerId") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: "Choisissez une date, une heure et un format." };
  }

  const date = cabinetLocalToIso(parsed.data.quand);
  if (!date) return { status: "error", message: "Date ou heure invalide." };

  const allowed = await autoriser(parsed.data.clientId);
  if (!allowed) return { status: "error", message: REFUS };

  const { data: existants } = await allowed.supabase
    .from("appointments")
    .select("id, type, status")
    .eq("client_id", parsed.data.clientId);

  const rdvs = (existants ?? []) as { id: string; type: string; status: string }[];

  // La clôture est jouée d'abord en mémoire : c'est l'état APRÈS elle qui dit
  // quelle étape devient franchissable. Rien n'est écrit tant que la demande
  // n'est pas jugée cohérente.
  const aTerminer = parsed.data.terminerId
    ? rdvs.find((r) => r.id === parsed.data.terminerId)
    : undefined;

  if (parsed.data.terminerId && !aTerminer) {
    return { status: "error", message: "Ce rendez-vous n'appartient pas à ce client." };
  }

  const projection = aTerminer
    ? rdvs.map((r) => (r.id === aTerminer.id ? { ...r, status: "termine" } : r))
    : rdvs;

  const attendu = jalonSuivant(projection);
  if (!attendu || attendu.type !== parsed.data.type) {
    return {
      status: "error",
      message: attendu
        ? `L'étape à poser est ${attendu.type}, pas ${parsed.data.type}.`
        : "L'étape précédente n'est pas terminée, ou l'étape suivante est déjà planifiée.",
    };
  }

  if (aTerminer) {
    const { error: clotureError } = await allowed.supabase
      .from("appointments")
      .update({ status: "termine" })
      .eq("id", aTerminer.id)
      .eq("client_id", parsed.data.clientId);

    if (clotureError) {
      return { status: "error", message: "Le rendez-vous précédent n'a pas pu être clos." };
    }
    await journaliser(allowed.staff.id, aTerminer.id, "appointment.termine");
  }

  const { data: cree, error } = await allowed.supabase
    .from("appointments")
    .insert({
      client_id: parsed.data.clientId,
      // Le référent s'il existe, sinon celui qui pose l'étape : un rendez-vous
      // sans conseiller n'apparaîtrait nulle part dans le tableau de bord.
      advisor_id: allowed.advisorId ?? allowed.staff.id,
      type: parsed.data.type,
      status: "planifie",
      date,
      duration_minutes: 60,
      mode: parsed.data.mode,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  if (cree?.id) await journaliser(allowed.staff.id, cree.id, "appointment.planifie");
  revalidate(parsed.data.clientId);
  return { status: "success" };
}

// ---------------------------------------------------------------------------
// Rappels de relance R1
// ---------------------------------------------------------------------------

const rappelSchema = z.object({
  clientId: z.uuid(),
  /** Le R0 qui motive la relance. */
  appointmentId: z.uuid(),
  quantite: z.coerce.number().int(),
  unite: z.enum(UNITES),
  note: z.string().trim().max(500).optional(),
});

/**
 * Le R0 est-il terminé, et sa fiche d'audit clôturée ?
 *
 * La carte du suivi n'affiche le formulaire que dans ce cas, mais un formulaire
 * trafiqué ne doit pas contourner la condition : on la revérifie ici, sur la
 * base, avant d'écrire quoi que ce soit.
 */
async function relanceOuverte(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  appointmentId: string
): Promise<boolean> {
  const [{ data: rdv }, { data: audit }] = await Promise.all([
    supabase
      .from("appointments")
      .select("type, status")
      .eq("id", appointmentId)
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase
      .from("audits")
      .select("status")
      .eq("appointment_id", appointmentId)
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);

  return rdv?.type === "R0" && rdv.status === "termine" && audit?.status === "termine";
}

/**
 * Pose le pense-bête de relance. L'échéance est recalculée ici et jamais reçue
 * du navigateur : ce que le formulaire affiche n'est qu'un aperçu.
 */
export async function poserRappel(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = rappelSchema.safeParse({
    clientId: formData.get("clientId"),
    appointmentId: formData.get("appointmentId"),
    quantite: formData.get("quantite"),
    unite: formData.get("unite"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "Choisissez un délai valide." };

  const due = echeance(new Date(), parsed.data.quantite, parsed.data.unite);
  if (!due) {
    return {
      status: "error",
      message: `Le délai doit être compris entre 1 et ${QUANTITE_MAX[parsed.data.unite]} ${parsed.data.unite}.`,
    };
  }

  const allowed = await autoriser(parsed.data.clientId);
  if (!allowed) return { status: "error", message: REFUS };

  if (!(await relanceOuverte(allowed.supabase, parsed.data.clientId, parsed.data.appointmentId))) {
    return {
      status: "error",
      message: "Le R0 doit être terminé et sa fiche d'audit clôturée.",
    };
  }

  const { data: cree, error } = await allowed.supabase
    .from("reminders")
    .insert({
      client_id: parsed.data.clientId,
      appointment_id: parsed.data.appointmentId,
      due_at: due.toISOString(),
      note: parsed.data.note ?? null,
      created_by: allowed.staff.id,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // L'index unique partiel : un rappel est déjà en attente sur ce R0. Le cas
    // arrive avec deux onglets ouverts, et n'est pas une erreur à afficher
    // comme un échec technique.
    if (error.code === "23505") {
      return { status: "error", message: "Un rappel est déjà prévu pour ce rendez-vous." };
    }
    return { status: "error", message: "Enregistrement impossible. Réessayez." };
  }

  if (cree?.id) await journaliser(allowed.staff.id, cree.id, "reminder.pose");
  revalidate(parsed.data.clientId);
  return { status: "success" };
}

/** Annule un rappel en attente. Le statut change, ce qui libère le R0. */
export async function annulerRappel(formData: FormData): Promise<void> {
  const parsed = z
    .object({ id: z.uuid(), clientId: z.uuid() })
    .safeParse({ id: formData.get("id"), clientId: formData.get("clientId") });
  if (!parsed.success) return;

  const allowed = await autoriser(parsed.data.clientId);
  if (!allowed) return;

  const { error } = await allowed.supabase
    .from("reminders")
    .update({ status: "annule" })
    .eq("id", parsed.data.id)
    .eq("client_id", parsed.data.clientId)
    .eq("status", "en_attente");
  if (error) return;

  await journaliser(allowed.staff.id, parsed.data.id, "reminder.annule");
  revalidate(parsed.data.clientId);
}
