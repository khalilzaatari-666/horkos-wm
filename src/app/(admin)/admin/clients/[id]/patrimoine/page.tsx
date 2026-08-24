import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminCard, AdminTable, Td } from "@/components/admin/ui";
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
import { AssetCreate } from "./asset-create";
import { AssetRowActions } from "./asset-row-actions";

export const metadata: Metadata = { title: "Patrimoine" };

export default async function ClientPatrimoinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, type, label, value")
    .eq("client_id", id)
    .order("value", { ascending: false });

  const assetRows: AssetRow[] = (assets ?? []).map((a) => ({
    id: a.id,
    type: a.type,
    label: a.label,
    value: Number(a.value) || 0,
  }));

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
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <div>
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
    </>
  );
}
