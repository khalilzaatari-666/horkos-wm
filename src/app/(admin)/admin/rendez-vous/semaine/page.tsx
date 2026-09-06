import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff";
import { peutAccederAuDossier } from "@/lib/client-access";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead } from "@/components/admin/ui";
import { MOIS_COURTS, formatDateLong } from "@/lib/dates";
import { PARCOURS, etatEtape } from "@/lib/parcours";
import { formatMinutes, DUREE_RDV_MIN } from "@/components/booking/grille";
import {
  partsCabinet,
  jourCabinet,
  lundiDeLaSemaine,
  lundiCourant,
  ajouterJours,
  rangDansLaSemaine,
  bornesSemaine,
} from "@/lib/cabinet-time";
import { RDV_STATUTS, MODES, type RdvStatut } from "../constants";
import { VueSwitch } from "../vue-switch";
import type { ConseillerOption } from "../filters";
import type { RdvContexte, RdvDetailData } from "../rdv-detail";
import { FiltresSemaine } from "./filtres";
import { Calendrier, type BlocSemaine, type JourSemaine } from "./calendrier";

export const metadata: Metadata = { title: "Rendez-vous" };

/** L'heure du rendez-vous s'affiche dans le fuseau du cabinet, pas celui du serveur. */
const rdvFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Casablanca",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const JOURS_COURTS = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Personne {
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Demande extends Personne {
  besoins: string[] | null;
  besoin_autre: string | null;
  patrimoine: string | null;
  investissement: string | null;
  message: string | null;
}

/** PostgREST rend une relation en objet ou en tableau selon la cardinalité inférée. */
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function fullName(p: { first_name: string | null; last_name: string | null } | null): string {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

/** « 2026-09-07 » → « Lun. 7 sept. », sans passer par le fuseau du lecteur. */
function libelleJour(iso: string): string {
  const d = new Date(Date.parse(`${iso}T00:00:00Z`));
  const rang = (d.getUTCDay() + 6) % 7;
  return `${JOURS_COURTS[rang]} ${d.getUTCDate()} ${MOIS_COURTS[d.getUTCMonth()]}`;
}

/**
 * L'agenda de la semaine, tous conseillers ou un seul.
 *
 * Une page distincte de la liste : celle-ci interroge une période ouverte avec
 * tri et plafond, celle-là deux bornes fermées sans l'un ni l'autre. Ce qu'elles
 * partagent - filtres, fenêtre de détail, styles de statut - est partagé pour de
 * bon, pas recopié.
 *
 * Chaque bloc porte ce que le calendrier du cabinet ne sait pas dire : l'étape
 * du parcours où en est ce client, et la fiche d'audit du rendez-vous quand elle
 * existe.
 */
export default async function AdminSemainePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const single = (k: string) => {
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) notFound();

  // Un seul instant de référence : `Date.now` est rejeté par la règle de pureté
  // des composants, et deux lectures pourraient tomber de part et d'autre de
  // minuit.
  const maintenant = new Date();
  const aujourdhui = jourCabinet(maintenant);
  // Une date explicite est lue telle quelle ; sans elle, l'agenda s'ouvre sur la
  // semaine de travail en cours - et le dimanche, sur celle qui commence.
  const lundi = lundiDeLaSemaine(single("du") ?? "") ?? lundiCourant(aujourdhui)!;
  const bornes = bornesSemaine(lundi);
  if (!bornes) notFound();

  const statut =
    (RDV_STATUTS as readonly string[]).includes(single("statut") ?? "")
      ? (single("statut") as RdvStatut)
      : null;
  const mode = (MODES as readonly string[]).includes(single("mode") ?? "") ? single("mode")! : null;

  // Absence de paramètre = « mon agenda » pour un conseiller, « tout le cabinet »
  // pour un admin. « tous » s'écrit explicitement pour élargir.
  const conseillerParam = single("conseiller");
  const conseiller =
    conseillerParam === "tous"
      ? null
      : conseillerParam && REGEX_UUID.test(conseillerParam)
        ? conseillerParam
        : staff.role === "conseiller"
          ? staff.id
          : null;

  const egalites: Record<string, string> = {};
  if (statut) egalites.status = statut;
  if (mode) egalites.mode = mode;
  if (conseiller) egalites.advisor_id = conseiller;

  // Une semaine est bornée par nature : ni tri ni plafond ici, contrairement à
  // la liste. `advisor_id` du client vient en plus - c'est lui qui décide si le
  // conseiller connecté peut entrer dans le dossier.
  const [{ data }, { data: equipe }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, client_id, type, status, date, mode, meeting_url, " +
          "client:client_id(first_name, last_name, email, phone, advisor_id), " +
          "advisor:advisor_id(first_name, last_name), " +
          "demande:appointment_requests!appointment_id(first_name, last_name, email, phone, besoins, besoin_autre, patrimoine, investissement, message)"
      )
      .gte("date", bornes.debut)
      .lt("date", bornes.fin)
      .match(egalites)
      .order("date", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("role", "conseiller")
      .order("last_name", { ascending: true }),
  ]);

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    clientId: (r.client_id as string) ?? null,
    type: r.type as string,
    status: r.status as string,
    date: r.date as string,
    mode: (r.mode as string) ?? null,
    meetingUrl: (r.meeting_url as string) ?? null,
    client: one(r.client as Personne & { advisor_id: string | null }),
    advisor: one(r.advisor as { first_name: string | null; last_name: string | null }),
    demande: one(r.demande as Demande),
  }));

  // Le contexte plateforme, en deux requêtes bornées aux clients de la semaine :
  // tous leurs rendez-vous pour situer le parcours, et les fiches d'audit
  // rattachées aux rendez-vous affichés.
  const clientIds = [...new Set(rows.map((r) => r.clientId).filter((v): v is string => !!v))];
  const rdvIds = rows.map((r) => r.id);

  const [{ data: parcoursRows }, { data: fiches }] = await Promise.all([
    clientIds.length
      ? supabase.from("appointments").select("client_id, type, status").in("client_id", clientIds)
      : Promise.resolve({ data: [] as { client_id: string; type: string; status: string }[] }),
    rdvIds.length
      ? supabase.from("audits").select("id, appointment_id").in("appointment_id", rdvIds)
      : Promise.resolve({ data: [] as { id: string; appointment_id: string | null }[] }),
  ]);

  const rdvParClient = new Map<string, { type: string; status: string }[]>();
  for (const r of parcoursRows ?? []) {
    const liste = rdvParClient.get(r.client_id);
    if (liste) liste.push({ type: r.type, status: r.status });
    else rdvParClient.set(r.client_id, [{ type: r.type, status: r.status }]);
  }

  const ficheParRdv = new Map(
    (fiches ?? [])
      .filter((f): f is { id: string; appointment_id: string } => !!f.appointment_id)
      .map((f) => [f.appointment_id, f.id])
  );

  const blocs: BlocSemaine[] = [];
  for (const r of rows) {
    const p = partsCabinet(new Date(r.date));
    const jour = `${p.annee}-${String(p.mois).padStart(2, "0")}-${String(p.jour).padStart(2, "0")}`;
    const rang = rangDansLaSemaine(lundi, jour);
    // Les bornes de la requête garantissent déjà la semaine ; ce garde-fou évite
    // qu'un rendez-vous égaré aille se placer hors de la grille.
    if (rang < 0 || rang > 6) continue;

    const d = r.demande;
    const nom = fullName(r.client) || fullName(r.demande);
    const heureFormatee = (() => {
      const s = rdvFmt.format(new Date(r.date));
      return s.charAt(0).toUpperCase() + s.slice(1);
    })();

    const contexte: RdvContexte | null = r.clientId
      ? {
          clientId: r.clientId,
          parcours: PARCOURS.map((e) => ({
            type: e.type,
            etat: etatEtape(e.type, rdvParClient.get(r.clientId!) ?? []),
          })),
          ficheAuditId: ficheParRdv.get(r.id) ?? null,
          accessible: peutAccederAuDossier(staff, r.client?.advisor_id ?? null),
        }
      : null;

    const detail: RdvDetailData = {
      id: r.id,
      heure: heureFormatee,
      type: r.type,
      mode: r.mode,
      meetingUrl: r.meetingUrl,
      nom,
      email: r.client?.email || r.demande?.email || null,
      phone: r.client?.phone || r.demande?.phone || null,
      sansCompte: !r.client,
      advisorName: fullName(r.advisor),
      status: r.status,
      demande: d
        ? {
            besoins: d.besoins ?? [],
            besoinAutre: d.besoin_autre,
            patrimoine: d.patrimoine,
            investissement: d.investissement,
            message: d.message,
            email: d.email ?? null,
            phone: d.phone ?? null,
          }
        : null,
      contexte,
    };

    blocs.push({
      rang,
      debut: p.minutes,
      fin: p.minutes + DUREE_RDV_MIN,
      heureCourte: formatMinutes(p.minutes),
      detail,
    });
  }

  // Cinq colonnes par défaut : le cabinet ferme le week-end. Un rendez-vous
  // samedi ou dimanche ouvre les deux colonnes manquantes plutôt que d'être
  // renvoyé dans une liste annexe.
  const nbJours = blocs.some((b) => b.rang > 4) ? 7 : 5;
  const jours: JourSemaine[] = Array.from({ length: nbJours }, (_, i) => {
    const cle = ajouterJours(lundi, i);
    return { cle, label: libelleJour(cle), aujourdhui: cle === aujourdhui };
  });

  const conseillers: ConseillerOption[] = (equipe ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Sans nom",
  }));

  // Les liens de navigation conservent les filtres en cours.
  const lienSemaine = (jour: string) => {
    const query = new URLSearchParams();
    if (statut) query.set("statut", statut);
    if (mode) query.set("mode", mode);
    if (conseillerParam) query.set("conseiller", conseillerParam);
    query.set("du", jour);
    return `/admin/rendez-vous/semaine?${query.toString()}`;
  };

  const semaineCourante = lundiCourant(aujourdhui)!;
  const flecheClasse =
    "grid place-items-center w-8 h-8 rounded-lg border border-cream-deep bg-white text-charcoal hover:border-bronze/50 hover:text-bronze-dark transition-colors";

  return (
    <AdminPanel>
      <AdminHead
        title="Rendez-vous"
        desc="La semaine du cabinet, heure par heure. Chaque bloc ouvre le questionnaire du client, l'étape de son parcours et sa fiche d'audit."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Link href={lienSemaine(ajouterJours(lundi, -7))} className={flecheClasse} aria-label="Semaine précédente">
            <span aria-hidden="true">‹</span>
          </Link>
          <Link href={lienSemaine(ajouterJours(lundi, 7))} className={flecheClasse} aria-label="Semaine suivante">
            <span aria-hidden="true">›</span>
          </Link>
          <span className="font-heading text-[16px] font-semibold text-ink ml-1">
            Semaine du {formatDateLong(`${lundi}T12:00:00Z`)}
          </span>
          {lundi !== semaineCourante && (
            <Link
              href={lienSemaine(semaineCourante)}
              className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium transition-colors ml-1"
            >
              Cette semaine
            </Link>
          )}
        </div>
        <VueSwitch
          active="semaine"
          params={{
            statut: single("statut"),
            mode: single("mode"),
            conseiller: single("conseiller"),
          }}
        />
      </div>

      <AnimateIn variant="fade-up" delay={40}>
        <FiltresSemaine
          conseillers={conseillers}
          valeurConseiller={conseiller ?? "tous"}
          total={blocs.length}
        />
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={60}>
        <Calendrier jours={jours} blocs={blocs} />
      </AnimateIn>

      {blocs.length === 0 && (
        <p className="text-[13px] text-warm-grey mt-4">
          Aucun rendez-vous cette semaine avec ces filtres.
        </p>
      )}
    </AdminPanel>
  );
}
