import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { etatEtape } from "@/lib/parcours";
import { sendRappelR1 } from "@/lib/email/rappel";

/**
 * Envoi des rappels de relance arrivés à échéance.
 *
 * Appelée toutes les heures par Vercel Cron (voir `vercel.json`), donc jamais
 * par un humain connecté : c'est pourquoi elle passe par la clé de service et
 * non par le client à session. La granularité réelle des rappels est celle de ce
 * cron - « dans 2 heures » part dans l'heure qui suit l'échéance.
 *
 * Rien n'est fait en parallèle : les envois sont peu nombreux, et les traiter
 * l'un après l'autre garde les journaux lisibles quand quelque chose cloche.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Au-delà, on laisse la main : la passe suivante prendra le reste. */
const PAR_PASSAGE = 50;

/** Après cinq refus d'affilée, le rappel cesse d'être retenté. */
const TENTATIVES_MAX = 5;

const cabinetFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Casablanca",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Comparaison à temps constant : un `===` fuiterait le secret par sa durée. */
function secretValide(entete: string | null, attendu: string): boolean {
  const fourni = entete?.startsWith("Bearer ") ? entete.slice(7) : "";
  const a = Buffer.from(fourni);
  const b = Buffer.from(attendu);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface Rappel {
  id: string;
  client_id: string;
  note: string | null;
  due_at: string;
  created_at: string;
  attempts: number;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET absente : la route reste fermée.");
    return Response.json({ erreur: "Cron non configuré." }, { status: 500 });
  }
  if (!secretValide(request.headers.get("authorization"), secret)) {
    return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return Response.json({ erreur: "Clé de service absente." }, { status: 500 });
  }

  const { data, error } = await admin
    .from("reminders")
    .select("id, client_id, note, due_at, created_at, attempts")
    .eq("status", "en_attente")
    .lte("due_at", new Date().toISOString())
    .lt("attempts", TENTATIVES_MAX)
    .order("due_at", { ascending: true })
    .limit(PAR_PASSAGE);

  if (error) {
    console.error("[cron] lecture des rappels échouée:", error.message);
    return Response.json({ erreur: "Lecture impossible." }, { status: 500 });
  }

  const rappels = (data ?? []) as Rappel[];
  let envoyes = 0;
  let sansObjet = 0;
  let echecs = 0;

  for (const rappel of rappels) {
    // Le R1 a-t-il été posé entre-temps ? `etatEtape` répond déjà à cette
    // question pour tout le reste de la plateforme : relancer pour un
    // rendez-vous déjà pris ferait passer le cabinet pour distrait.
    const { data: rdvs } = await admin
      .from("appointments")
      .select("type, status")
      .eq("client_id", rappel.client_id);

    if (etatEtape("R1", rdvs ?? []) !== "avenir") {
      await admin
        .from("reminders")
        .update({ status: "sans_objet", sent_at: new Date().toISOString() })
        .eq("id", rappel.id);
      sansObjet += 1;
      continue;
    }

    const { data: client } = await admin
      .from("profiles")
      .select("id, first_name, last_name, email, phone, advisor_id")
      .eq("id", rappel.client_id)
      .maybeSingle();

    if (!client) {
      // Le dossier a disparu sous le rappel : il n'a plus d'objet non plus.
      await admin.from("reminders").update({ status: "sans_objet" }).eq("id", rappel.id);
      sansObjet += 1;
      continue;
    }

    const resultat = await sendRappelR1({
      client: {
        id: client.id,
        name:
          [client.first_name, client.last_name].filter(Boolean).join(" ") || "Client sans nom",
        email: client.email ?? null,
        phone: client.phone ?? null,
      },
      advisorId: client.advisor_id ?? null,
      note: rappel.note,
      poseLe: cabinetFmt.format(new Date(rappel.created_at)),
      echeanceLe: cabinetFmt.format(new Date(rappel.due_at)),
    });

    if (resultat.ok) {
      await admin
        .from("reminders")
        .update({ status: "envoye", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", rappel.id);
      envoyes += 1;
    } else {
      // Le statut ne bouge pas : la passe suivante réessaiera. Au bout de cinq
      // tentatives le rappel sort de la requête et reste visible, en attente et
      // porteur de son erreur, plutôt que de disparaître en silence.
      await admin
        .from("reminders")
        .update({ attempts: rappel.attempts + 1, last_error: resultat.erreur })
        .eq("id", rappel.id);
      echecs += 1;
    }
  }

  const resume = { dus: rappels.length, envoyes, sansObjet, echecs };
  console.log("[cron] rappels:", JSON.stringify(resume));
  return Response.json(resume);
}
