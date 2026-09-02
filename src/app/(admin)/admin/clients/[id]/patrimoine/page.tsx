import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminCard, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { RepartitionBar } from "@/components/client/repartition-bar";
import { formatDateLong } from "@/lib/dates";
import {
  repartition,
  totalPatrimoine,
  performance12m,
  assetTypeLabel,
  formatMAD,
  formatPercent,
  type AssetRow,
  type ValuationRow,
} from "@/lib/patrimoine";
import { AuditCreate } from "../audits/audit-create";
import { AuditOpenButton } from "../audits/audit-open-button";
import { AuditRowActions } from "../audits/audit-row-actions";
import { AssetCreate } from "./asset-create";
import { AssetRowActions } from "./asset-row-actions";

export const metadata: Metadata = { title: "Audits" };

/**
 * Audit et patrimoine sur une seule page : c'est l'audit qui établit le
 * patrimoine du client, les séparer obligeait à lire deux onglets pour une
 * seule réalité. L'audit vient en premier, le détail des actifs en dessous.
 */
export default async function ClientPatrimoinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: assets }, { data: auditData }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, type, label, value")
      .eq("client_id", id)
      .order("value", { ascending: false }),
    supabase
      .from("audits")
      .select("id, status, pdf_url, created_at, updated_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const assetRows: AssetRow[] = (assets ?? []).map((a) => ({
    id: a.id,
    type: a.type,
    label: a.label,
    value: Number(a.value) || 0,
  }));
  const audits = auditData ?? [];

  const lastValued = new Map<string, string>();
  let valuations: ValuationRow[] = [];
  if (assetRows.length) {
    const { data: vals } = await supabase
      .from("asset_valuations")
      .select("asset_id, value, valued_at")
      .in(
        "asset_id",
        assetRows.map((a) => a.id)
      )
      .order("valued_at", { ascending: false });
    valuations = (vals ?? []).map((v) => ({
      asset_id: v.asset_id,
      value: Number(v.value) || 0,
      valued_at: v.valued_at,
    }));
    for (const v of valuations) {
      if (!lastValued.has(v.asset_id)) lastValued.set(v.asset_id, v.valued_at);
    }
  }

  const total = totalPatrimoine(assetRows);
  const classes = repartition(assetRows);
  const perf = performance12m(assetRows, valuations);

  return (
    <>
      {/* Audit */}
      <section className="mb-9">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="font-heading text-[17.5px] font-semibold text-ink">Audit patrimonial</h2>
            <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px] mt-1">
              Le statut et le rapport sont visibles par le client sur sa page patrimoine ; le PDF
              reste privé (lien signé).
            </p>
          </div>
          <AuditCreate clientId={id} />
        </div>

        <AnimateIn variant="fade-up" delay={60}>
          <AdminTable
            headers={["Statut", "Rapport", "Ouvert le", "Mis à jour", ""]}
            isEmpty={audits.length === 0}
            empty="Aucun audit. Ouvrez-en un — le client verra son statut sur sa page patrimoine."
          >
            {audits.map((a) => {
              const hasReport = Boolean(a.pdf_url);
              return (
                <tr key={a.id} className="hover:bg-cream/40 transition-colors align-top">
                  <Td>
                    <AdminBadge tone={a.status === "termine" ? "succes" : "attente"}>
                      {a.status === "termine" ? "Terminé" : "En cours"}
                    </AdminBadge>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {hasReport ? (
                      <AuditOpenButton auditId={a.id} />
                    ) : (
                      <span className="text-warm-grey">-</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-warm-grey">
                    {formatDateLong(a.created_at)}
                  </Td>
                  <Td className="whitespace-nowrap text-warm-grey">
                    {formatDateLong(a.updated_at)}
                  </Td>
                  <Td>
                    <AuditRowActions
                      clientId={id}
                      audit={{ id: a.id, status: a.status, hasReport }}
                    />
                  </Td>
                </tr>
              );
            })}
          </AdminTable>
        </AnimateIn>
      </section>

      {/* Patrimoine */}
      <section>
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="font-heading text-[17.5px] font-semibold text-ink mb-2">Patrimoine</h2>
            <div className="font-heading text-[24px] font-semibold text-ink leading-none">
              {total > 0 ? formatMAD(total) : "-"}
            </div>
            <div className="text-[12.5px] text-warm-grey mt-1.5">
              {assetRows.length} actif(s)
              {perf.percent !== null && (
                <>
                  {" · "}
                  <span className={perf.percent >= 0 ? "text-emerald-700" : "text-red-600"}>
                    {formatPercent(perf.percent)} sur 12 mois
                  </span>
                </>
              )}
            </div>
          </div>
          <AssetCreate clientId={id} />
        </div>

        {classes.length > 0 && (
          <AnimateIn variant="fade-up">
            <AdminCard className="p-6 mb-4">
              <RepartitionBar classes={classes} />
            </AdminCard>
          </AnimateIn>
        )}

        <AnimateIn variant="fade-up" delay={60}>
          <AdminTable
            headers={["Type", "Intitulé", "Valeur", "Dernier relevé", ""]}
            isEmpty={assetRows.length === 0}
            empty="Aucun actif. Ajoutez le premier avec « Ajouter un actif » — il apparaîtra aussitôt dans l'espace du client."
          >
            {assetRows.map((a) => (
              <tr key={a.id} className="hover:bg-cream/40 transition-colors align-top">
                <Td className="whitespace-nowrap text-bronze-dark font-medium">
                  {assetTypeLabel(a.type)}
                </Td>
                <Td className="text-ink">{a.label}</Td>
                <Td className="whitespace-nowrap tabular-nums font-medium text-ink">
                  {formatMAD(a.value)}
                </Td>
                <Td className="whitespace-nowrap text-warm-grey">
                  {lastValued.get(a.id) ? formatDateLong(lastValued.get(a.id)!) : "-"}
                </Td>
                <Td>
                  <AssetRowActions clientId={id} asset={a} />
                </Td>
              </tr>
            ))}
          </AdminTable>
        </AnimateIn>
      </section>
    </>
  );
}
