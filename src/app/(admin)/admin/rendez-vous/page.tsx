import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminTable, Td } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";
import { RendezVousFilters, type ConseillerOption } from "./filters";
import {
  RDV_STATUTS,
  RDV_STATUT_STYLES,
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

interface Row {
  id: string;
  type: string;
  status: string;
  date: string;
  mode: string | null;
  meeting_url: string | null;
  client: { first_name: string | null; last_name: string | null; email: string | null } | null;
  advisor: { first_name: string | null; last_name: string | null } | null;
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
  // de types — de quoi faire dépasser la limite mémoire du worker TypeScript
  // de Next au moment du build.
  const egalites: Record<string, string> = {};
  if (statut) egalites.status = statut;
  if (mode) egalites.mode = mode;
  if (conseiller) egalites.advisor_id = conseiller;

  // Le tri par date part à Postgres ; celui par nom se fait en mémoire, car il
  // porte sur une table jointe. À ce volume la différence est nulle, et une
  // règle simple vaut mieux qu'un tri à moitié délégué.
  const base = supabase
    .from("appointments")
    .select(
      "id, type, status, date, mode, meeting_url, client:client_id(first_name, last_name, email), advisor:advisor_id(first_name, last_name)"
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

  const [{ data }, { data: staff }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("role", "conseiller")
      .order("last_name", { ascending: true }),
  ]);

  const rows: Row[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    type: r.type as string,
    status: r.status as string,
    date: r.date as string,
    mode: (r.mode as string) ?? null,
    meeting_url: (r.meeting_url as string) ?? null,
    client: one(r.client as Row["client"]),
    advisor: one(r.advisor as Row["advisor"]),
  }));

  const collator = new Intl.Collator("fr", { sensitivity: "base" });
  const sorted = [...rows].sort((a, b) => {
    let diff = 0;
    if (tri === "date") diff = a.date.localeCompare(b.date);
    else if (tri === "client") diff = collator.compare(fullName(a.client), fullName(b.client));
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
        desc="Les créneaux réservés, tous conseillers confondus. Un rendez-vous sans client rattaché vient d'un visiteur qui n'a pas encore créé son espace."
      />

      <AnimateIn variant="fade-up" delay={40}>
        <RendezVousFilters conseillers={conseillers} total={sorted.length} />
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            <TriHeader
              key="date"
              label="Date"
              colonne="date"
              triActuel={tri}
              sensActuel={sens}
              params={triParams}
            />,
            "Type",
            <TriHeader
              key="client"
              label="Client"
              colonne="client"
              triActuel={tri}
              sensActuel={sens}
              params={triParams}
            />,
            <TriHeader
              key="conseiller"
              label="Conseiller"
              colonne="conseiller"
              triActuel={tri}
              sensActuel={sens}
              params={triParams}
            />,
            "Format",
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
          {sorted.map((r) => {
            const style =
              RDV_STATUT_STYLES[r.status as RdvStatut] ?? RDV_STATUT_STYLES.planifie;
            const nomClient = fullName(r.client);

            return (
              <tr key={r.id} className="hover:bg-cream/40 transition-colors">
                <Td className="whitespace-nowrap font-medium text-ink">
                  {formatDateTime(r.date)}
                </Td>

                <Td className="whitespace-nowrap">
                  <span className="inline-block text-[11.5px] font-semibold text-charcoal bg-cream border border-cream-deep px-2 py-0.5 rounded-md">
                    {r.type}
                  </span>
                </Td>

                <Td>
                  {nomClient ? (
                    <>
                      <div className="text-ink font-medium">{nomClient}</div>
                      {r.client?.email && (
                        <a
                          href={`mailto:${r.client.email}`}
                          className="block text-[12px] text-bronze-dark hover:text-bronze transition-colors truncate max-w-[200px]"
                        >
                          {r.client.email}
                        </a>
                      )}
                    </>
                  ) : (
                    <span className="text-[12px] text-warm-grey italic">
                      Visiteur sans compte
                    </span>
                  )}
                </Td>

                <Td className="whitespace-nowrap">
                  {fullName(r.advisor) || <span className="text-warm-grey">—</span>}
                </Td>

                <Td className="whitespace-nowrap">
                  {r.mode === "visio" ? (
                    r.meeting_url ? (
                      <a
                        href={r.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-bronze-dark hover:text-bronze transition-colors"
                      >
                        Visio — rejoindre
                      </a>
                    ) : (
                      <span className="text-warm-grey">Visio — lien à envoyer</span>
                    )
                  ) : (
                    <span className="text-charcoal">Au cabinet</span>
                  )}
                </Td>

                <Td>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${style.pill}`}
                  >
                    <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </Td>
              </tr>
            );
          })}
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
