import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { formatDateLong } from "@/lib/dates";
import { formatMAD } from "@/lib/patrimoine";

export const metadata: Metadata = { title: "Soumissions" };

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
export default async function ClientSoumissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: soumissions } = await supabase
    .from("asset_submissions")
    .select("id, asset_type, description, estimated_value, reason, horizon, status, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const rows = soumissions ?? [];

  return (
    <section>
      <h2 className="font-heading text-[17.5px] font-semibold text-ink mb-1">
        Soumissions d&apos;actifs
      </h2>
      <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px] mb-4">
        Les dossiers de cession déposés par ce client depuis le site public ou son espace.
      </p>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Actif", "Valeur estimée", "Motif", "Horizon", "Reçu le", "Statut"]}
          isEmpty={rows.length === 0}
          empty="Aucune soumission pour l'instant."
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
