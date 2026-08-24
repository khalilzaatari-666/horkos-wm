import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminTable } from "@/components/admin/ui";
import { RendezVousFilters, type ConseillerOption } from "./filters";
import { RdvRow, type RdvRowData } from "./rdv-row";
import {
  RDV_STATUTS,
  PERIODES,
  MODES,
  TRIS,
  DEFAULTS,
  MAX_ROWS,
  type RdvStatut,
  type Periode,
  type Tri,
} from "./constants";

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

interface Row {
  id: string;
  type: string;
  status: string;
  date: string;
  mode: string | null;
  meeting_url: string | null;
  /** Compte client rattaché (null tant que le visiteur n'en a pas créé). */
  client: Personne | null;
  advisor: { first_name: string | null; last_name: string | null } | null;
  /** Questionnaire de prise de rendez-vous rattaché - la source du contexte. */
  demande: Demande | null;
}

/** PostgREST rend une relation en objet ou en tableau selon la cardinalité inférée. */
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function fullName(p: { first_name: string | null; last_name: string | null } | null): string {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

/** Ne retient qu'une valeur figurant dans la liste autorisée. */
function pick<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T | null
): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** En-tête cliquable : bascule le sens quand la colonne est déjà celle du tri. */
function TriHeader({
  label,
  colonne,
  triActuel,
  sensActuel,
  params,
}: {
  label: string;
  colonne: Tri;
  triActuel: Tri;
  sensActuel: "asc" | "desc";
  params: Record<string, string | undefined>;
}) {
  const actif = triActuel === colonne;
  const sens = actif && sensActuel === "asc" ? "desc" : "asc";

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "tri" && k !== "sens") query.set(k, v);
  }
  query.set("tri", colonne);
  query.set("sens", sens);

  return (
    <Link
      href={`?${query.toString()}`}
      scroll={false}
      className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${
        actif ? "text-ink" : ""
      }`}
      aria-label={`Trier par ${label}, ordre ${sens === "asc" ? "croissant" : "décroissant"}`}
    >
      {label}
      <span aria-hidden="true" className={actif ? "opacity-100" : "opacity-25"}>
        {actif && sensActuel === "desc" ? "↓" : "↑"}
      </span>
    </Link>
  );
}

export default async function AdminRendezVousPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const single = (k: string) => {
    const v = raw[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const periode = pick<Periode>(single("periode"), PERIODES, DEFAULTS.periode)!;
  const statut = pick<RdvStatut>(single("statut"), RDV_STATUTS, null);
  const mode = pick(single("mode"), MODES, null);
  const conseiller = single("conseiller") ?? null;
  const tri = pick<Tri>(single("tri"), TRIS, DEFAULTS.tri)!;
  const sens = single("sens") === "desc" ? "desc" : "asc";

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Filtres appliqués par Postgres : inutile de rapatrier ce qu'on va jeter.
  //
  // Les égalités passent par un seul `match` plutôt que par des `.eq()`
  // enchaînés sur une variable réassignée. Ce n'est pas une coquetterie : la
  // réassignation d'un constructeur de requête Supabase fait réinstancier ses
  // génériques à chaque maillon, et coûtait à elle seule 63 000 instanciations
  // de types - de quoi faire dépasser la limite mémoire du worker TypeScript
  // de Next au moment du build.
  const egalites: Record<string, string> = {};
  if (statut) egalites.status = statut;
  if (mode) egalites.mode = mode;
  if (conseiller) egalites.advisor_id = conseiller;

  // Le tri par date part à Postgres ; celui par nom se fait en mémoire, car il
  // porte sur une table jointe. À ce volume la différence est nulle, et une
  // règle simple vaut mieux qu'un tri à moitié délégué.
  //
  // `demande` est la relation inverse (appointment_requests.appointment_id) :
  // elle porte le questionnaire, seule source du nom d'un visiteur sans compte
  // et du contexte (besoins, patrimoine, message).
  const base = supabase
    .from("appointments")
    .select(
      "id, type, status, date, mode, meeting_url, " +
        "client:client_id(first_name, last_name, email, phone), " +
        "advisor:advisor_id(first_name, last_name), " +
        "demande:appointment_requests!appointment_id(first_name, last_name, email, phone, besoins, besoin_autre, patrimoine, investissement, message)"
    )
    .match(egalites)
    .order("date", { ascending: periode === "passes" ? false : sens === "asc" })
    .limit(MAX_ROWS);

  // La borne de date reste une branche, mais une seule, sur un type déjà fixé.
  const query =
    periode === "avenir"
      ? base.gte("date", nowIso)
      : periode === "passes"
        ? base.lt("date", nowIso)
        : base;

  const [{ data }, { data: staff }, { count: totalMatch }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("role", "conseiller")
      .order("last_name", { ascending: true }),
    // Total à filtres égaux (statut/mode/conseiller) mais SANS borne de date :
    // sert à signaler les rendez-vous cachés par la période courante, pour qu'un
    // « à venir » vide ne laisse pas croire qu'il n'y a aucun rendez-vous.
    supabase.from("appointments").select("*", { count: "exact", head: true }).match(egalites),
  ]);

  const rows: Row[] = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    type: r.type as string,
    status: r.status as string,
    date: r.date as string,
    mode: (r.mode as string) ?? null,
    meeting_url: (r.meeting_url as string) ?? null,
    client: one(r.client as Personne),
    advisor: one(r.advisor as Row["advisor"]),
    demande: one(r.demande as Demande),
  }));

  const collator = new Intl.Collator("fr", { sensitivity: "base" });
  // Le nom affiché vient du compte s'il existe, sinon du questionnaire.
  const nomAffiche = (r: Row) => fullName(r.client) || fullName(r.demande);
  const sorted = [...rows].sort((a, b) => {
    let diff = 0;
    if (tri === "date") diff = a.date.localeCompare(b.date);
    else if (tri === "client") diff = collator.compare(nomAffiche(a), nomAffiche(b));
    else if (tri === "conseiller")
      diff = collator.compare(fullName(a.advisor), fullName(b.advisor));
    else if (tri === "statut") diff = collator.compare(a.status, b.status);
    // Départage par date : deux lignes du même conseiller gardent un ordre
    // stable et lisible plutôt que celui, arbitraire, de la base.
    if (diff === 0) diff = a.date.localeCompare(b.date);
    return sens === "asc" ? diff : -diff;
  });

  const conseillers: ConseillerOption[] = (staff ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Sans nom",
  }));

  // Tout le calcul d'affichage se fait ici, côté serveur : la ligne cliente ne
  // reçoit que des chaînes prêtes. L'heure surtout est formatée ici pour que le
  // fuseau du cabinet soit identique au rendu serveur, sans écart d'hydratation.
  const displayRows: RdvRowData[] = sorted.map((r) => {
    const d = r.demande;
    const heure = (() => {
      const s = rdvFmt.format(new Date(r.date));
      return s.charAt(0).toUpperCase() + s.slice(1);
    })();
    return {
      id: r.id,
      heure,
      type: r.type,
      mode: r.mode,
      meetingUrl: r.meeting_url,
      nom: nomAffiche(r),
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
    };
  });

  // Rendez-vous masqués par la période courante (mêmes autres filtres).
  const horsPeriode =
    periode === "tous" ? 0 : Math.max(0, (totalMatch ?? 0) - sorted.length);
  const toutePeriode = new URLSearchParams();
  if (statut) toutePeriode.set("statut", statut);
  if (mode) toutePeriode.set("mode", mode);
  if (conseiller) toutePeriode.set("conseiller", conseiller);
  toutePeriode.set("periode", "tous");

  const triParams: Record<string, string | undefined> = {
    periode: single("periode"),
    statut: single("statut"),
    mode: single("mode"),
    conseiller: single("conseiller"),
  };

  return (
    <AdminPanel>
      <AdminHead
        title="Rendez-vous"
        desc="Les créneaux réservés, tous conseillers confondus. Chaque ligne porte le contexte du questionnaire ; « visiteur » signale un rendez-vous pris sans compte client."
      />

      <AnimateIn variant="fade-up" delay={40}>
        <RendezVousFilters conseillers={conseillers} total={sorted.length} />
      </AnimateIn>

      {horsPeriode > 0 && (
        <p className="text-[12.5px] text-warm-grey -mt-1 mb-3">
          {horsPeriode} autre{horsPeriode > 1 ? "s" : ""} rendez-vous hors de la période affichée.{" "}
          <Link
            href={`?${toutePeriode.toString()}`}
            scroll={false}
            className="text-bronze-dark hover:text-bronze font-medium transition-colors"
          >
            Voir toute la période
          </Link>
        </p>
      )}

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            <TriHeader
              key="date"
              label="Rendez-vous"
              colonne="date"
              triActuel={tri}
              sensActuel={sens}
              params={triParams}
            />,
            <TriHeader
              key="client"
              label="Client"
              colonne="client"
              triActuel={tri}
              sensActuel={sens}
              params={triParams}
            />,
            "Questionnaire",
            <TriHeader
              key="conseiller"
              label="Conseiller"
              colonne="conseiller"
              triActuel={tri}
              sensActuel={sens}
              params={triParams}
            />,
            <TriHeader
              key="statut"
              label="Statut"
              colonne="statut"
              triActuel={tri}
              sensActuel={sens}
              params={triParams}
            />,
          ]}
          isEmpty={sorted.length === 0}
          empty="Aucun rendez-vous ne correspond à ces filtres."
        >
          {displayRows.map((row) => (
            <RdvRow key={row.id} data={row} />
          ))}
        </AdminTable>
      </AnimateIn>

      {sorted.length >= MAX_ROWS && (
        <p className="text-[12px] text-warm-grey mt-4">
          Affichage limité aux {MAX_ROWS} premiers rendez-vous. Affinez les filtres pour voir le
          reste.
        </p>
      )}
    </AdminPanel>
  );
}
