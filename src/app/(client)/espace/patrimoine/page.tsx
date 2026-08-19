import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, PanelHead, Card, CardTitle, CardGrid, EmptyPanel, Badge } from "@/components/client/ui";
import { RepartitionBar } from "@/components/client/repartition-bar";
import { formatDateLong } from "@/lib/dates";
import {
  repartition,
  totalPatrimoine,
  assetTypeLabel,
  formatMAD,
  type AssetRow,
} from "@/lib/patrimoine";

export const metadata: Metadata = { title: "Mon patrimoine" };

export default async function PatrimoinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: assets }, { data: audit }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, type, label, value, created_at")
      .eq("client_id", user.id)
      .order("value", { ascending: false }),
    supabase
      .from("audits")
      .select("id, status, pdf_url, created_at, updated_at")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const assetRows: AssetRow[] = (assets ?? []).map((a) => ({
    id: a.id,
    type: a.type,
    label: a.label,
    value: Number(a.value) || 0,
  }));

  const classes = repartition(assetRows);
  const total = totalPatrimoine(assetRows);

  return (
    <Panel>
      <PanelHead
        eyebrow="Ce que vous détenez"
        title="Mon patrimoine"
        desc="La photographie de vos actifs telle que votre conseiller la tient à jour."
      />

      {assetRows.length === 0 && !audit ? (
        <AnimateIn variant="fade-up" delay={80}>
          <EmptyPanel
            title="Aucun actif enregistré"
            desc="Vos actifs sont saisis par votre conseiller lors de l'audit patrimonial. Ils apparaîtront ici avec leur répartition dès que l'audit sera lancé."
            action={{ href: "/rendez-vous", label: "Demander un audit" }}
          />
        </AnimateIn>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-3.5">
            <AnimateIn variant="fade-up" delay={80} className="h-full">
              <Card center className="p-6 h-full">
                <CardTitle>Répartition par classe d&apos;actifs</CardTitle>
                {classes.length > 0 ? (
                  <>
                    <div className="font-heading text-[24px] font-semibold text-ink mb-5 leading-none">
                      {formatMAD(total)}
                    </div>
                    <RepartitionBar classes={classes} />
                  </>
                ) : (
                  <p className="text-[13px] text-warm-grey leading-[1.65]">
                    Aucun actif valorisé pour l&apos;instant.
                  </p>
                )}
              </Card>
            </AnimateIn>

            <AnimateIn variant="fade-up" delay={140} className="h-full">
              <Card center className="p-6 h-full">
                <CardTitle>Audit patrimonial</CardTitle>
                {audit ? (
                  <>
                    <div className="flex items-center gap-2.5 mb-3">
                      <Badge tone={audit.status === "termine" ? "succes" : "attente"}>
                        {audit.status === "termine" ? "Terminé" : "En cours"}
                      </Badge>
                      <span className="text-[12.5px] text-warm-grey">
                        Ouvert le {formatDateLong(audit.created_at)}
                      </span>
                    </div>
                    <p className="text-[13px] text-warm-grey leading-[1.65]">
                      {audit.status === "termine"
                        ? "Votre audit est disponible. Il détaille votre situation, les points d'attention relevés et la structuration proposée."
                        : "Votre conseiller travaille sur votre audit. Vous serez prévenu dès qu'il sera disponible."}
                    </p>
                    {audit.pdf_url && (
                      <a
                        href={audit.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 px-5 py-2.5 text-[13px] font-medium bg-ink text-cream rounded-lg hover:bg-navy transition-colors"
                      >
                        Télécharger le rapport
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-[13px] text-warm-grey leading-[1.65]">
                    Aucun audit n&apos;a encore été ouvert. Il est réalisé lors du premier
                    rendez-vous, à partir des éléments que vous transmettez.
                  </p>
                )}
              </Card>
            </AnimateIn>
          </div>

          {assetRows.length > 0 && (
            <section className="mt-9">
              <AnimateIn variant="fade-up" delay={200}>
                <h2 className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase mb-3">
                  Détail par actif
                </h2>
                <CardGrid min="260px">
                  {assetRows.map((a) => (
                    <Card key={a.id} className="p-5 h-full flex flex-col">
                      <div className="text-[11px] font-semibold tracking-[1.3px] uppercase text-bronze-dark">
                        {assetTypeLabel(a.type)}
                      </div>
                      {/* `flex-1` aligne les montants au bas de chaque carte,
                          quelle que soit la longueur de l'intitulé. */}
                      <div className="text-[13.5px] font-medium text-ink leading-[1.4] mt-2 flex-1">
                        {a.label}
                      </div>
                      <div className="font-heading text-[19px] font-semibold text-ink tabular-nums mt-3">
                        {formatMAD(a.value)}
                      </div>
                    </Card>
                  ))}
                </CardGrid>
              </AnimateIn>
            </section>
          )}
        </>
      )}
    </Panel>
  );
}
