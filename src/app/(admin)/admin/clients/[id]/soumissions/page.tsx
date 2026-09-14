import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { formatDateLong } from "@/lib/dates";
import { formatMAD } from "@/lib/patrimoine";
import { param, pick, sensDe, trier, instant } from "@/lib/liste";

export const metadata: Metadata = { title: "Cession d'actifs" };

const STATUS: Record<string, { label: string; tone: "neutre" | "attente" | "succes" | "refus" }> = {
  soumis: { label: "Soumis", tone: "attente" },
  en_revue: { label: "En revue", tone: "attente" },
  accepte: { label: "Accepté", tone: "succes" },
  rejete: { label: "Non retenu", tone: "refus" },
};

/**
 * Les dossiers de cession de ce client. Vue filtrée de la même table que la
 * liste globale (`asset_submissions`) - ici, pas de colonne « déposant » : on
 * est déjà sur la page du client, la préciser serait redondant.
 */
const TRIS = ["actif", "valeur", "recu", "statut"] as const;
const STATUTS = ["soumis", "en_revue", "accepte", "rejete"] as const;

export default async function ClientSoumissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "recu")!;
  const sens = sensDe(param(raw, "sens"), tri === "recu" ? "desc" : "asc");
  const statut = pick(param(raw, "statut"), STATUTS, null);
  const supabase = await createClient();

  const { data: soumissions } = await supabase
    .from("asset_submissions")
    .select("id, asset_type, description, estimated_value, reason, horizon, status, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const toutes = soumissions ?? [];
  const rows = trier(
    toutes.filter((s) => statut === null || s.status === statut),
    (s) =>
      tri === "actif"
        ? s.asset_type
        : tri === "valeur"
          ? (Number(s.estimated_value) || null)
          : tri === "statut"
            ? s.status
            : instant(s.created_at),
    sens,
    (s) => s.asset_type
  );

  const qs = { statut: statut ?? undefined };

  return (
    <section>
      <h2 className="font-heading text-[17.5px] font-semibold text-ink mb-1">
        Cession d&apos;actifs
      </h2>
      <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px] mb-4">
        Les dossiers de cession déposés par ce client depuis le site public ou son espace.
      </p>

      {toutes.length > 0 && (
        <AnimateIn variant="fade-up" delay={40}>
          <FiltresListe
            champs={[
              {
                cle: "statut",
                aria: "Statut",
                toutes: "Tous les statuts",
                options: STATUTS.map((v) => ({ value: v, label: STATUS[v].label })),
              },
            ]}
            total={rows.length}
            unite="dossier"
          />
        </AnimateIn>
      )}

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            <TriHeader key="a" label="Actif" colonne="actif" tri={tri} sens={sens} params={qs} />,
            <TriHeader
              key="v"
              label="Valeur estimée"
              colonne="valeur"
              tri={tri}
              sens={sens}
              params={qs}
              sensInitial="desc"
            />,
            "Motif",
            "Horizon",
            <TriHeader
              key="r"
              label="Reçu le"
              colonne="recu"
              tri={tri}
              sens={sens}
              params={qs}
              sensInitial="desc"
            />,
            <TriHeader key="s" label="Statut" colonne="statut" tri={tri} sens={sens} params={qs} />,
          ]}
          isEmpty={rows.length === 0}
          empty={statut ? "Aucun dossier dans cet état." : "Aucun dossier pour l'instant."}
        >
          {rows.map((s) => {
            const status = STATUS[s.status] ?? { label: s.status, tone: "neutre" as const };
            return (
              <tr key={s.id} className="hover:bg-cream/40 transition-colors align-top">
                <Td className="max-w-[280px]">
                  <div className="font-medium text-ink">{s.asset_type}</div>
                  {s.description && (
                    <p className="text-[12px] text-warm-grey leading-[1.5] mt-1">{s.description}</p>
                  )}
                </Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {s.estimated_value ? formatMAD(Number(s.estimated_value)) : "-"}
                </Td>
                <Td>{s.reason ?? "-"}</Td>
                <Td>{s.horizon ?? "-"}</Td>
                <Td className="whitespace-nowrap text-warm-grey">{formatDateLong(s.created_at)}</Td>
                <Td>
                  <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                </Td>
              </tr>
            );
          })}
        </AdminTable>
      </AnimateIn>
    </section>
  );
}
