import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminCard, AdminKpi } from "@/components/admin/ui";
import { RepartitionBar } from "@/components/client/repartition-bar";
import {
  repartition,
  totalPatrimoine,
  performance12m,
  formatMAD,
  formatPercent,
  type AssetRow,
  type ValuationRow,
} from "@/lib/patrimoine";

export const metadata: Metadata = { title: "Dossier client" };

export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: assets }, { data: audit }, { count: docCount }, { count: recoCount }] =
    await Promise.all([
      supabase.from("assets").select("id, type, label, value").eq("client_id", id),
      supabase
        .from("audits")
        .select("status, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("documents").select("*", { count: "exact", head: true }).eq("client_id", id),
      supabase
        .from("client_recommendations")
        .select("*", { count: "exact", head: true })
        .eq("client_id", id),
    ]);

  const assetRows: AssetRow[] = (assets ?? []).map((a) => ({
    id: a.id,
    type: a.type,
    label: a.label,
    value: Number(a.value) || 0,
  }));

  let valuations: ValuationRow[] = [];
  if (assetRows.length) {
    const { data: vals } = await supabase
      .from("asset_valuations")
      .select("asset_id, value, valued_at")
      .in(
        "asset_id",
        assetRows.map((a) => a.id)
      );
    valuations = (vals ?? []).map((v) => ({
      asset_id: v.asset_id,
      value: Number(v.value) || 0,
      valued_at: v.valued_at,
    }));
  }

  const total = totalPatrimoine(assetRows);
  const classes = repartition(assetRows);
  const perf = performance12m(assetRows, valuations);

  const auditLabel = audit
    ? audit.status === "termine"
      ? "Terminé"
      : "En cours"
    : "Aucun";

  const base = `/admin/clients/${id}`;

  return (
    <>
      <AnimateIn variant="fade-up">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
          <AdminKpi label="Patrimoine" value={total > 0 ? formatMAD(total) : "-"} href={`${base}/patrimoine`} />
          <AdminKpi
            label="Performance 12 mois"
            value={perf.percent === null ? "-" : formatPercent(perf.percent)}
            note={perf.percent === null ? "Historique insuffisant" : `${perf.covered} actif(s)`}
          />
          <AdminKpi label="Actifs" value={String(assetRows.length)} href={`${base}/patrimoine`} />
          <AdminKpi label="Audit" value={auditLabel} href={`${base}/audits`} />
          <AdminKpi label="Documents" value={String(docCount ?? 0)} href={`${base}/documents`} />
          <AdminKpi
            label="Recommandations"
            value={String(recoCount ?? 0)}
            href={`${base}/recommandations`}
          />
        </div>
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={80}>
        <AdminCard className="p-6 mt-3.5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-heading text-[16px] font-semibold text-ink">
              Répartition du patrimoine
            </h2>
            <Link
              href={`${base}/patrimoine`}
              className="text-[12.5px] text-bronze-dark hover:text-bronze transition-colors shrink-0"
            >
              Gérer le patrimoine →
            </Link>
          </div>
          {classes.length > 0 ? (
            <>
              <div className="font-heading text-[22px] font-semibold text-ink mb-4 leading-none">
                {formatMAD(total)}
              </div>
              <RepartitionBar classes={classes} />
            </>
          ) : (
            <p className="text-[13px] text-warm-grey leading-[1.65]">
              Aucun actif enregistré. Ajoutez-en depuis l&apos;onglet Patrimoine pour voir la
              répartition apparaître ici et dans l&apos;espace du client.
            </p>
          )}
        </AdminCard>
      </AnimateIn>
    </>
  );
}
