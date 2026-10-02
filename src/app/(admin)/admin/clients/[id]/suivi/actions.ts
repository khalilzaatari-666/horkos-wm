"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, type ActionState } from "@/lib/staff";
import { peutAccederAuDossier } from "@/lib/client-access";
import { cabinetLocalToIso, partsCabinet } from "@/lib/cabinet-time";
import { jalonSuivant, refusChangement } from "@/lib/parcours";
import { echeance, r0ARelancer, ETAPES_RAPPEL, QUANTITE_MAX, UNITES, type EtapeRappel } from "@/lib/rappels";
import { createReminderEvent, deleteAppointmentEvent } from "@/lib/google-calendar";
import { choisirConseiller, dureeRendezVous, libelleDuree, titreRendezVous } from "@/lib/rendez-vous";
import { OUVERTURE, FERMETURE, DEJEUNER_DEBUT, DEJEUNER_FIN } from "@/components/booking/grille";
import { advisorRecipient } from "@/lib/email/recipients";
import { SITE_URL } from "@/lib/site";
import { annulerEtPrevenir, inviterAuRendezVous, occupationsAdmin, type RendezVousANotifier } from "@/lib/booking";

/** Les statuts qu'une commande du suivi peut poser. */
const STATUTS = ["confirme", "termine", "non_honore", "annule"] as const;

const REFUS = "Ce dossier est piloté par son conseiller référent.";

/** Ce que les commandes relisent d'un rendez-vous avant d'agir et de prévenir. */
const RDV_COLONNES = "id, client_id, advisor_id, type, status, mode, date, calendar_event_id";

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
 * Le conseiller qui tiendra le rendez-vous posé à `debut` : voir
 * `choisirConseiller`. `actuel` est le titulaire d'un rendez-vous qu'on
 * déplace, qui n'est pas compté comme occupé.
 *
 * La charge se lit sur douze heures de part et d'autre, soit la journée du
 * cabinet sans calcul de jour local : elle ne sert qu'à départager.
 */
async function titulaireDuCreneau(
  allowed: NonNullable<Awaited<ReturnType<typeof autoriser>>>,
  debut: Date,
  duree: number,
  deplace?: { id: string; advisor_id: string | null }
): Promise<string | null> {
  const { data: equipe } = await allowed.supabase.from("profiles").select("id").eq("role", "conseiller");
  const conseillers = (equipe ?? []).map((p) => p.id as string);
  if (conseillers.length === 0) return null;

  const { data: occupations } = await allowed.supabase
    .from("appointments")
    .select("id, advisor_id, date, duration_minutes")
    .in("advisor_id", conseillers)
    .in("status", ["planifie", "confirme"])
    .gte("date", new Date(debut.getTime() - 12 * 3_600_000).toISOString())
    .lt("date", new Date(debut.getTime() + 12 * 3_600_000).toISOString());

  return choisirConseiller(
    conseillers,
    [deplace?.advisor_id, allowed.advisorId],
    (occupations ?? []).filter((o) => o.id !== deplace?.id),
    debut,
    duree
  );
}

const SANS_CONSEILLER =
  "Aucun conseiller n'est enregistré : invitez-en un depuis Utilisateurs.";

/**
 * Annuler, marquer terminé ou non honoré, rétablir. Une seule commande : ce
 * sont des écritures du même champ, et les distinguer n'apporterait que des
 * copies.
 *
 * Le rendez-vous est mis à jour par son id ET son client : un id volé sur un
 * autre dossier ne passerait pas le filtre.
 *
 * Le parcours est relu d'abord (`refusChangement`) : l'onglet grise déjà les
 * commandes refusées, ce contrôle arrête un formulaire trafiqué ou un onglet
 * resté ouvert sur un état périmé.
 */
export async function setAppointmentStatus(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
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
  if (!parsed.success) return { status: "error", message: "Commande invalide." };

  const allowed = await autoriser(parsed.data.clientId);
  if (!allowed) return { status: "error", message: REFUS };

  const { data: rdvs } = await allowed.supabase
    .from("appointments")
    .select(RDV_COLONNES)
    .eq("client_id", parsed.data.clientId);
  const refus = refusChangement(rdvs ?? [], parsed.data.id, parsed.data.status, new Date());
  if (refus) return { status: "error", message: refus };
  const avant = (rdvs ?? []).find((r) => r.id === parsed.data.id) as RendezVousANotifier & {
    status: string;
  };

  const { error } = await allowed.supabase
    .from("appointments")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("client_id", parsed.data.clientId);
  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  await journaliser(allowed.staff.id, parsed.data.id, `appointment.${parsed.data.status}`);

  // Ce que le client doit apprendre : une annulation, ou un rendez-vous
  // rétabli qui est encore à venir. Terminé, non honoré, rouvert : du
  // classement interne, rien ne part.
  if (parsed.data.status === "annule") {
    await annulerEtPrevenir({ supabase: allowed.supabase, rdv: avant });
  } else if (avant.status === "annule" && new Date(avant.date).getTime() > Date.now()) {
    await inviterAuRendezVous({ supabase: allowed.supabase, rdv: avant, motif: "planifie" });
  }

  revalidate(parsed.data.clientId);
  return { status: "success" };
}

const planifierSchema = z.object({
  clientId: z.uuid(),
  type: z.enum(["R0", "R1", "R2"]),
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
 * pour un client n'est pas. L'événement d'agenda et les emails suivent,
 * par `inviterAuRendezVous`, comme pour une réservation du client.
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

  const titulaire = await titulaireDuCreneau(allowed, new Date(date), dureeRendezVous(parsed.data.type));
  if (!titulaire) return { status: "error", message: SANS_CONSEILLER };

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
  }

  const { data: cree, error } = await allowed.supabase
    .from("appointments")
    .insert({
      client_id: parsed.data.clientId,
      advisor_id: titulaire,
      type: parsed.data.type,
      status: "planifie",
      date,
      // La durée tient à l'étape : 1 h 30 pour un R1, 1 h pour un R2.
      duration_minutes: dureeRendezVous(parsed.data.type),
      mode: parsed.data.mode,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // La clôture n'a de sens qu'avec la suite : sans elle, le rendez-vous
    // précédent retrouve son statut, et le conseiller réessaie depuis le même
    // état.
    if (aTerminer) {
      await allowed.supabase
        .from("appointments")
        .update({ status: aTerminer.status })
        .eq("id", aTerminer.id)
        .eq("client_id", parsed.data.clientId);
    }
    return { status: "error", message: "Enregistrement impossible. Réessayez." };
  }

  if (aTerminer) await journaliser(allowed.staff.id, aTerminer.id, "appointment.termine");
  if (cree?.id) {
    await journaliser(allowed.staff.id, cree.id, "appointment.planifie");
    await inviterAuRendezVous({
      supabase: allowed.supabase,
      rdv: {
        id: cree.id,
        client_id: parsed.data.clientId,
        advisor_id: titulaire,
        type: parsed.data.type,
        mode: parsed.data.mode,
        date,
        calendar_event_id: null,
      },
      motif: "planifie",
    });
  }

  // L'étape est posée : la relance qui l'attendait n'a plus d'objet. Le cron le
  // constaterait à l'échéance, mais d'ici là la case resterait dans l'agenda.
  if (parsed.data.type === "R0" || parsed.data.type === "R1") {
    const { data: caducs } = await allowed.supabase
      .from("reminders")
      .update({ status: "sans_objet" })
      .eq("client_id", parsed.data.clientId)
      .eq("etape", parsed.data.type)
      .eq("status", "en_attente")
      .select("calendar_event_id");
    for (const r of caducs ?? []) {
      if (r.calendar_event_id) await deleteAppointmentEvent(r.calendar_event_id);
    }
  }

  revalidate(parsed.data.clientId);
  return { status: "success" };
}

/**
 * Déplace un rendez-vous encore posé. Même ligne, même statut : il n'est ni
 * annulé ni recréé, donc les statistiques ne comptent pas une annulation qui
 * n'en est pas une. Le client reçoit la nouvelle heure et une invitation à jour.
 */
export async function deplacerRendezVous(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = z
    .object({ id: z.uuid(), clientId: z.uuid(), quand: z.string() })
    .safeParse({
      id: formData.get("id"),
      clientId: formData.get("clientId"),
      quand: formData.get("quand"),
    });
  if (!parsed.success) return { status: "error", message: "Choisissez une date et une heure." };

  const date = cabinetLocalToIso(parsed.data.quand);
  if (!date) return { status: "error", message: "Date ou heure invalide." };
  if (new Date(date).getTime() <= Date.now()) {
    return { status: "error", message: "Choisissez une heure à venir." };
  }

  const allowed = await autoriser(parsed.data.clientId);
  if (!allowed) return { status: "error", message: REFUS };

  const { data: rdv } = await allowed.supabase
    .from("appointments")
    .select(RDV_COLONNES)
    .eq("id", parsed.data.id)
    .eq("client_id", parsed.data.clientId)
    .maybeSingle();
  if (!rdv) return { status: "error", message: "Ce rendez-vous n'appartient pas à ce client." };
  if (rdv.status !== "planifie" && rdv.status !== "confirme") {
    return { status: "error", message: "Seul un rendez-vous encore posé se déplace." };
  }

  // Le titulaire reste, s'il est conseiller ; sinon (un admin, un compte sans
  // rôle) le rendez-vous rejoint l'agenda d'un vrai conseiller.
  const titulaire = await titulaireDuCreneau(
    allowed,
    new Date(date),
    dureeRendezVous(rdv.type),
    { id: rdv.id, advisor_id: rdv.advisor_id }
  );
  if (!titulaire) return { status: "error", message: SANS_CONSEILLER };

  const { error } = await allowed.supabase
    .from("appointments")
    .update({ date, advisor_id: titulaire })
    .eq("id", rdv.id)
    .eq("client_id", parsed.data.clientId);
  if (error) return { status: "error", message: "Enregistrement impossible. Réessayez." };

  await journaliser(allowed.staff.id, rdv.id, "appointment.deplace");
  await inviterAuRendezVous({
    supabase: allowed.supabase,
    rdv: { ...(rdv as RendezVousANotifier), date, advisor_id: titulaire },
    motif: "deplace",
  });

  revalidate(parsed.data.clientId);
  return { status: "success" };
}

// ---------------------------------------------------------------------------
// Rappels de relance R1
// ---------------------------------------------------------------------------

const rappelSchema = z.object({
  clientId: z.uuid(),
  etape: z.enum(ETAPES_RAPPEL),
  /** Le R0 tenu qui motive une relance R1. Absent pour un rappel de R0. */
  appointmentId: z.uuid().optional(),
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

/** Le R0 est-il encore à caler ? Même règle que l'onglet Suivi et le cron. */
async function r0Ouvert(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<boolean> {
  const { data: rdvs } = await supabase
    .from("appointments")
    .select("type, status, date")
    .eq("client_id", clientId);
  return r0ARelancer(rdvs ?? [], new Date());
}

/** Durée de la case posée dans l'agenda : le temps d'un appel de reprise. */
const RAPPEL_DUREE_MIN = 30;

/**
 * À qui appartient la relance ? Le conseiller référent, et à défaut celui qui
 * pose le rappel - sans quoi l'événement n'atterrirait sur l'agenda de personne.
 */
async function porteurDuRappel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  advisorId: string | null,
  auteurId: string
): Promise<{ name: string; email: string } | null> {
  const referent = await advisorRecipient(advisorId);
  if (referent) return referent;

  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", auteurId)
    .maybeSingle();

  const email = (data?.email as string | null)?.trim();
  if (!email) return null;
  return {
    name: [data?.first_name, data?.last_name].filter(Boolean).join(" ") || "Conseiller",
    email,
  };
}

/**
 * Inscrit la relance dans l'agenda du conseiller, en plus de l'email que le cron
 * enverra à l'échéance.
 *
 * L'email prévient le jour dit ; l'événement, lui, se voit à l'avance - c'est en
 * préparant sa semaine que le conseiller doit découvrir ses relances, pas en
 * ouvrant sa boîte le matin même.
 *
 * Rend l'identifiant de l'événement, ou `null` : agenda non configuré, référent
 * sans adresse, refus de Google. Aucun de ces cas ne remet en cause le rappel
 * lui-même, déjà enregistré quand on arrive ici.
 */
async function inscrireAuCalendrier(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  clientId: string;
  advisorId: string | null;
  auteurId: string;
  etape: EtapeRappel;
  due: Date;
  note: string | null;
}): Promise<string | null> {
  const [porteur, { data: client }] = await Promise.all([
    porteurDuRappel(input.supabase, input.advisorId, input.auteurId),
    input.supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", input.clientId)
      .maybeSingle(),
  ]);
  if (!porteur) return null;

  const nom =
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") || "un client";

  const description = [
    `Reprendre contact avec ${nom} pour convenir du ${input.etape}.`,
    ...(input.note ? [``, `Votre note : ${input.note}`] : []),
    ``,
    `Suivi du dossier : ${SITE_URL}/admin/clients/${input.clientId}/suivi`,
  ].join("\n");

  return createReminderEvent({
    summary: `Relance ${input.etape} - ${nom}`,
    description,
    startIso: input.due.toISOString(),
    durationMin: RAPPEL_DUREE_MIN,
    attendees: [{ email: porteur.email, displayName: porteur.name }],
  });
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
    etape: formData.get("etape"),
    appointmentId: formData.get("appointmentId") || undefined,
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

  const { etape, appointmentId } = parsed.data;
  if (etape === "R1") {
    if (
      !appointmentId ||
      !(await relanceOuverte(allowed.supabase, parsed.data.clientId, appointmentId))
    ) {
      return {
        status: "error",
        message: "Le R0 doit être terminé et sa fiche d'audit clôturée.",
      };
    }
  } else if (!(await r0Ouvert(allowed.supabase, parsed.data.clientId))) {
    return { status: "error", message: "Un R0 est déjà tenu ou planifié." };
  }

  const { data: cree, error } = await allowed.supabase
    .from("reminders")
    .insert({
      client_id: parsed.data.clientId,
      etape,
      // Un rappel de R0 n'a pas de rendez-vous d'origine.
      appointment_id: etape === "R1" ? appointmentId : null,
      due_at: due.toISOString(),
      note: parsed.data.note ?? null,
      created_by: allowed.staff.id,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // L'index unique partiel : un rappel est déjà en attente pour cette étape. Le cas
    // arrive avec deux onglets ouverts, et n'est pas une erreur à afficher
    // comme un échec technique.
    if (error.code === "23505") {
      return { status: "error", message: "Un rappel est déjà prévu pour cette étape." };
    }
    return { status: "error", message: "Enregistrement impossible. Réessayez." };
  }

  if (cree?.id) await journaliser(allowed.staff.id, cree.id, "reminder.pose");

  // L'agenda vient après l'écriture, et volontairement : le rappel doit tenir
  // même si Google est indisponible. L'identifiant n'est rattaché qu'ensuite,
  // pour qu'une annulation sache quoi retirer.
  if (cree?.id) {
    const eventId = await inscrireAuCalendrier({
      supabase: allowed.supabase,
      clientId: parsed.data.clientId,
      advisorId: allowed.advisorId,
      auteurId: allowed.staff.id,
      etape,
      due,
      note: parsed.data.note ?? null,
    });
    if (eventId) {
      await allowed.supabase
        .from("reminders")
        .update({ calendar_event_id: eventId })
        .eq("id", cree.id);
    }
  }

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

  const { data: annule, error } = await allowed.supabase
    .from("reminders")
    .update({ status: "annule" })
    .eq("id", parsed.data.id)
    .eq("client_id", parsed.data.clientId)
    .eq("status", "en_attente")
    .select("calendar_event_id")
    .maybeSingle();
  if (error) return;

  // Une relance à laquelle on a renoncé n'a plus à occuper l'agenda.
  if (annule?.calendar_event_id) await deleteAppointmentEvent(annule.calendar_event_id);

  await journaliser(allowed.staff.id, parsed.data.id, "reminder.annule");
  revalidate(parsed.data.clientId);
}

/**
 * Remet en file un rappel que le cron a cessé de retenter. L'échéance, passée,
 * reste la même : il part à la passe suivante.
 */
export async function relancerRappel(formData: FormData): Promise<void> {
  const parsed = z
    .object({ id: z.uuid(), clientId: z.uuid() })
    .safeParse({ id: formData.get("id"), clientId: formData.get("clientId") });
  if (!parsed.success) return;

  const allowed = await autoriser(parsed.data.clientId);
  if (!allowed) return;

  const { error } = await allowed.supabase
    .from("reminders")
    .update({ attempts: 0, last_error: null })
    .eq("id", parsed.data.id)
    .eq("client_id", parsed.data.clientId)
    .eq("status", "en_attente");
  if (error) return;

  await journaliser(allowed.staff.id, parsed.data.id, "reminder.relance");
  revalidate(parsed.data.clientId);
}

// ---------------------------------------------------------------------------
// Disponibilité du conseiller pour l'étape qu'on s'apprête à poser
// ---------------------------------------------------------------------------

/** Un rendez-vous déjà présent sur l'agenda, qui empiète sur l'heure choisie. */
export interface Conflit {
  /** « 10:00 - 11:30 », heure du cabinet. */
  creneau: string;
  /** L'intitulé du rendez-vous qui occupe déjà la place. */
  intitule: string;
  /** Le dossier concerné, ou null pour un rendez-vous sans compte rattaché. */
  client: string | null;
}

export type Disponibilite =
  | { etat: "inconnu" }
  | {
      etat: "libre" | "occupe";
      /** « 1 h 30 », pour que l'écran dise sur quoi porte la vérification. */
      duree: string;
      conflits: Conflit[];
      /** Hors jour ouvré, avant l'ouverture, sur le déjeuner ou après la fermeture. */
      horsHoraires: boolean;
      /** L'agenda lu est celui de la personne connectée. */
      soi: boolean;
      /** Le conseiller qui tiendra le rendez-vous. */
      nom: string;
      /** L'heure choisie est déjà passée. */
      passe: boolean;
    };

const heureFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Casablanca",
  hour: "2-digit",
  minute: "2-digit",
});

/** Le rendez-vous tient-il dans une plage ouverte du cabinet ? */
function dansLesHoraires(debut: Date, dureeMin: number): boolean {
  const p = partsCabinet(debut);
  const jour = new Date(debut).getUTCDay();
  // `partsCabinet` ne rend pas le jour de la semaine ; le décalage de
  // Casablanca ne change jamais la date à une heure ouvrable, l'UTC suffit donc.
  if (jour === 0 || jour === 6) return false;

  const fin = p.minutes + dureeMin;
  const matin = p.minutes >= OUVERTURE && fin <= DEJEUNER_DEBUT;
  const apresMidi = p.minutes >= DEJEUNER_FIN && fin <= FERMETURE;
  return matin || apresMidi;
}

/**
 * Le créneau choisi est-il libre sur l'agenda du conseiller qui prendra ce
 * rendez-vous ?
 *
 * Appelée pendant la saisie, à chaque changement d'heure : le conseiller doit
 * l'apprendre en choisissant, pas après avoir enregistré. C'est un avis, jamais
 * un verrou - un R1 posé volontairement en face d'autre chose reste possible,
 * et `planifierEtape` n'en tient pas compte.
 *
 * L'agenda consulté est celui qui tiendra le rendez-vous, selon la même règle
 * que `planifierEtape` et `deplacerRendezVous` (`titulaireDuCreneau`).
 */
export async function verifierCreneau(
  clientId: string,
  type: string,
  quand: string,
  /** Le rendez-vous qu'on déplace : sa place actuelle n'est pas un conflit. */
  ignorer?: string
): Promise<Disponibilite> {
  const parsed = z
    .object({
      clientId: z.uuid(),
      type: z.enum(["R0", "R1", "R2", "revue", "autre"]),
      quand: z.string(),
      ignorer: z.uuid().optional(),
    })
    .safeParse({ clientId, type, quand, ignorer });
  if (!parsed.success) return { etat: "inconnu" };

  const iso = cabinetLocalToIso(parsed.data.quand);
  if (!iso) return { etat: "inconnu" };

  const allowed = await autoriser(parsed.data.clientId);
  if (!allowed) return { etat: "inconnu" };

  const duree = dureeRendezVous(parsed.data.type);
  const debut = new Date(iso);

  const { data: deplace } = parsed.data.ignorer
    ? await allowed.supabase
        .from("appointments")
        .select("id, advisor_id")
        .eq("id", parsed.data.ignorer)
        .eq("client_id", parsed.data.clientId)
        .maybeSingle()
    : { data: null };
  const titulaire = await titulaireDuCreneau(allowed, debut, duree, deplace ?? undefined);
  if (!titulaire) return { etat: "inconnu" };

  const { data: tenant } = await allowed.supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", titulaire)
    .maybeSingle();
  const fin = new Date(debut.getTime() + duree * 60_000);

  // Fenêtre de lecture volontairement large : un rendez-vous commencé avant
  // celui-ci peut encore empiéter dessus. Quatre heures couvrent largement la
  // plus longue durée du cabinet (1 h 30).
  const depuis = new Date(debut.getTime() - 4 * 3_600_000).toISOString();

  let requete = allowed.supabase
    .from("appointments")
    .select("id, type, date, duration_minutes, client_id, client:client_id(first_name, last_name)")
    .eq("advisor_id", titulaire)
    .in("status", ["planifie", "confirme"])
    .gte("date", depuis)
    .lt("date", fin.toISOString());
  if (parsed.data.ignorer) requete = requete.neq("id", parsed.data.ignorer);
  const { data: rdvs } = await requete;

  type Personne = { first_name: string | null; last_name: string | null };
  const nom = (p: Personne | Personne[] | null | undefined) => {
    const one = Array.isArray(p) ? (p[0] ?? null) : (p ?? null);
    return one ? [one.first_name, one.last_name].filter(Boolean).join(" ") : "";
  };

  const conflits: Conflit[] = (rdvs ?? [])
    .filter((r) => {
      const d = new Date(r.date);
      const f = new Date(d.getTime() + (r.duration_minutes ?? 60) * 60_000);
      // Chevauchement strict : deux rendez-vous qui se touchent bout à bout
      // (11 h 30 après un 10 h 00 - 11 h 30) n'en sont pas un.
      return d < fin && f > debut;
    })
    .map((r) => {
      const d = new Date(r.date);
      const f = new Date(d.getTime() + (r.duration_minutes ?? 60) * 60_000);
      return {
        creneau: `${heureFmt.format(d)} - ${heureFmt.format(f)}`,
        intitule: titreRendezVous(r.type),
        client: nom(r.client as Personne | Personne[] | null) || null,
      };
    });

  // L'agenda Google de l'admin, sur toute la durée de l'étape (1 h 30 pour un
  // R1) : un avis de plus, comme le reste. Les rendez-vous de l'app en sont
  // exclus, ils figurent déjà ci-dessus. Google muet -> rien d'ajouté.
  for (const o of (await occupationsAdmin(debut.toISOString(), fin.toISOString())) ?? []) {
    conflits.push({
      creneau: `${heureFmt.format(o.debut)} - ${heureFmt.format(o.fin)}`,
      intitule: "Occupé dans l'agenda Google de l'admin",
      client: null,
    });
  }

  return {
    etat: conflits.length > 0 ? "occupe" : "libre",
    duree: libelleDuree(duree),
    conflits,
    horsHoraires: !dansLesHoraires(debut, duree),
    soi: titulaire === allowed.staff.id,
    nom: [tenant?.first_name, tenant?.last_name].filter(Boolean).join(" ") || "Le conseiller",
    passe: debut.getTime() < Date.now(),
  };
}
