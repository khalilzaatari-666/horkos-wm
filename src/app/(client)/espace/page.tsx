import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import {
  Panel,
  PanelHead,
  Card,
  CardTitle,
  CardGrid,
  Kpi,
  EmptyPanel,
  Badge,
} from "@/components/client/ui";
import { RepartitionBar } from "@/components/client/repartition-bar";
import { formatDateShort, formatDateLong } from "@/lib/dates";
import {
  repartition,
  totalPatrimoine,
  performance12m,
  concentration,
  formatMAD,
  formatPercent,
  type AssetRow,
  type ValuationRow,
} from "@/lib/patrimoine";
import { PARCOURS, etatEtape } from "@/lib/parcours";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function EspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Les politiques RLS filtrent déjà sur le client connecté ; le `eq` explicite
  // est une seconde barrière, pas une redondance inutile.
  const [
    { data: assets },
    { data: nextAppointment },
    { data: recos },
    { data: allAppointments },
    { data: dossiers },
  ] = await Promise.all([
    supabase
      .from("assets")
      .select("id, type, label, value")
      .eq("client_id", user.id),
    supabase
      .from("appointments")
      .select("id, type, date, status")
      .eq("client_id", user.id)
      .gte("date", new Date().toISOString())
      .in("status", ["planifie", "confirme"])
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("client_recommendations")
      .select("id, status, recommendations(id, title, category)")
      .eq("client_id", user.id)
      .eq("status", "proposee")
      .order("created_at", { ascending: false })
      .limit(4),
    // Tous les rendez-vous, annulés compris : l'état d'une étape se lit sur
    // l'ensemble, pas seulement sur ceux à venir.
    supabase
      .from("appointments")
      .select("type, status")
      .eq("client_id", user.id),
    // Seuls les dossiers encore en mouvement. Un dossier accepté ou écarté est
    // une décision prise, sa place est dans l'historique de /espace/ceder.
    supabase
      .from("asset_submissions")
      .select("id, asset_type, status, estimated_value, created_at")
      .eq("client_id", user.id)
      .in("status", ["soumis", "en_revue"])
      .order("created_at", { ascending: false }),
  ]);

  const assetRows: AssetRow[] = (assets ?? []).map((a) => ({
    id: a.id,
    type: a.type,
    label: a.label,
    value: Number(a.value) || 0,
  }));

  // Les valorisations ne sont demandées que s'il y a des actifs : sinon la
  // requête `in()` partirait avec une liste vide.
  let valuations: ValuationRow[] = [];
  if (assetRows.length > 0) {
    const { data } = await supabase
      .from("asset_valuations")
      .select("asset_id, value, valued_at")
      .in(
        "asset_id",
        assetRows.map((a) => a.id),
      );
    valuations = (data ?? []).map((v) => ({
      asset_id: v.asset_id,
      value: Number(v.value) || 0,
      valued_at: v.valued_at,
    }));
  }

  const total = totalPatrimoine(assetRows);
  const classes = repartition(assetRows);
  const perf = performance12m(assetRows, valuations);
  const dominante = concentration(classes);
  const appointments = allAppointments ?? [];
  const cessions = dossiers ?? [];

  return (
    <Panel>
      <PanelHead eyebrow="Vue d'ensemble" title="Tableau de bord" />

      <AnimateIn variant="fade-up" delay={100}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Kpi
            label="Patrimoine suivi"
            value={assetRows.length ? formatMAD(total) : "—"}
            note={assetRows.length ? undefined : "Aucun actif enregistré"}
          />
          <Kpi
            label="Performance 12 mois"
            value={
              perf.percent === null
                ? "Pas encore d'historique"
                : formatPercent(perf.percent)
            }
            muted={perf.percent === null}
            note={
              perf.since ? `Depuis le ${formatDateLong(perf.since)}` : undefined
            }
          />
          <Kpi label="Actifs suivis" value={String(assetRows.length)} />
          <Kpi
            label="Prochain rendez-vous"
            value={
              nextAppointment ? formatDateShort(nextAppointment.date) : "—"
            }
            note={
              nextAppointment
                ? nextAppointment.type
                : "Aucun rendez-vous planifié"
            }
          />
        </div>
      </AnimateIn>

      {/* Deux tiers / un tiers : la répartition porte une légende par classe
          d'actifs et supporte mal d'être comprimée à moitié d'écran. Le parcours
          et les recommandations, plus courts, se partagent l'autre tiers. */}
      <div className="grid lg:grid-cols-[3fr_2fr] gap-3.5 mt-3.5">
        <AnimateIn variant="fade-up" delay={160} className="h-full">
          <Card center className="p-6 h-full">
            <CardTitle>Répartition de mon patrimoine</CardTitle>
            {classes.length > 0 ? (
              <>
                <RepartitionBar classes={classes} />
                {dominante && (
                  // Un constat, pas une alerte : c'est au conseiller de
                  // qualifier si cette concentration pose problème.
                  <p className="text-[12.5px] text-charcoal leading-[1.6] mt-5 pt-4 border-t border-cream-deep">
                    <strong className="font-medium text-ink">
                      {dominante.share.toFixed(0)} %
                    </strong>{" "}
                    de votre patrimoine repose sur une seule classe
                    d&apos;actifs, {dominante.label.toLowerCase()}. Un point à
                    aborder avec votre conseiller.
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13px] text-warm-grey leading-[1.65]">
                Votre conseiller n&apos;a pas encore enregistré vos actifs. La
                répartition apparaîtra ici dès le premier audit patrimonial.
              </p>
            )}
          </Card>
        </AnimateIn>

        <div className="flex flex-col gap-3.5">
          {appointments.length > 0 && (
            <AnimateIn variant="fade-up" delay={190}>
              <Link href="/espace/accompagnement" className="block">
                <Card className="p-5 transition-all duration-300 hover:shadow-md hover:border-bronze/40">
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <h2 className="font-heading text-[16px] font-semibold text-ink leading-[1.3]">
                      Mon accompagnement
                    </h2>
                    <span className="text-[12.5px] text-bronze-dark shrink-0">
                      Détail →
                    </span>
                  </div>
                  <div className="flex items-stretch gap-2">
                    {PARCOURS.map((etape) => {
                      const state = etatEtape(etape.type, appointments);
                      return (
                        <div key={etape.type} className="flex-1 min-w-0">
                          {/* Le trait porte l'avancement ; le texte dessous le
                              nomme. Franchie ou à venir doit se distinguer sans
                              lire, d'un seul coup d'œil. */}
                          <div
                            className={`h-1.5 rounded-full ${
                              state === "fait"
                                ? "bg-ink"
                                : state === "encours"
                                  ? "bg-bronze"
                                  : "bg-cream-deep"
                            }`}
                          />
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span
                              className={`text-[12px] font-semibold ${
                                state === "avenir"
                                  ? "text-warm-grey"
                                  : "text-ink"
                              }`}
                            >
                              {etape.type}
                            </span>
                            {state === "encours" && (
                              <span className="text-[10.5px] text-bronze-dark font-medium">
                                en cours
                              </span>
                            )}
                            {state === "fait" && (
                              <span
                                className="text-[10.5px] text-warm-grey"
                                aria-hidden="true"
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-warm-grey truncate mt-0.5">
                            {etape.title}
                          </div>
                          <span className="sr-only">
                            {state === "fait"
                              ? "étape franchie"
                              : state === "encours"
                                ? "étape en cours"
                                : "étape à venir"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </Link>
            </AnimateIn>
          )}

          {/* `flex-1` : c'est cette carte qui absorbe la hauteur restante, pour
              que la colonne s'arrête au même niveau que la répartition. */}
          <AnimateIn variant="fade-up" delay={220} className="flex-1">
            <Card center className="p-6 h-full">
              <CardTitle>À suivre</CardTitle>
              {recos && recos.length > 0 ? (
                <CardGrid min="220px">
                  {recos.map((r) => {
                    const reco = Array.isArray(r.recommendations)
                      ? r.recommendations[0]
                      : r.recommendations;
                    if (!reco) return null;
                    return (
                      <Link
                        key={r.id}
                        href={`/espace/recommandations/${reco.id}`}
                        className="flex flex-col h-full p-4 rounded-lg border border-cream-deep hover:border-bronze/40 hover:bg-cream/40 transition-colors"
                      >
                        <span className="text-[11px] font-semibold tracking-[1.2px] uppercase text-bronze-dark">
                          {reco.category}
                        </span>
                        <span className="text-[13.5px] font-medium text-ink leading-[1.4] mt-1.5 flex-1">
                          {reco.title}
                        </span>
                        <span className="mt-3">
                          <Badge tone="attente">À étudier</Badge>
                        </span>
                      </Link>
                    );
                  })}
                </CardGrid>
              ) : (
                <p className="text-[13px] text-warm-grey leading-[1.65]">
                  Rien ne requiert votre attention pour l&apos;instant. Les
                  recommandations de votre conseiller apparaîtront ici.
                </p>
              )}
            </Card>
          </AnimateIn>
        </div>
      </div>

      {cessions.length > 0 && (
        <section className="mt-9">
          <AnimateIn variant="fade-up" delay={280}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase">
                Dossiers de cession en cours
              </h2>
              <Link
                href="/espace/ceder"
                className="text-[12.5px] text-bronze-dark hover:text-bronze transition-colors shrink-0"
              >
                Tous mes dossiers →
              </Link>
            </div>
            <CardGrid min="240px">
              {cessions.map((c) => (
                <Card key={c.id} className="p-5 h-full flex flex-col">
                  <div className="flex items-start gap-2.5 mb-2">
                    <span className="text-[13.5px] font-medium text-ink flex-1 min-w-0">
                      {c.asset_type}
                    </span>
                    <Badge tone="attente">
                      {c.status === "en_revue" ? "En revue" : "Soumis"}
                    </Badge>
                  </div>
                  <div className="text-[11.5px] text-warm-grey flex-1">
                    Déposé le {formatDateLong(c.created_at)}
                  </div>
                  {c.estimated_value ? (
                    <div className="font-heading text-[17px] font-semibold text-ink tabular-nums mt-3">
                      {formatMAD(Number(c.estimated_value))}
                    </div>
                  ) : null}
                </Card>
              ))}
            </CardGrid>
          </AnimateIn>
        </section>
      )}

      {assetRows.length === 0 && !nextAppointment && (
        <AnimateIn variant="fade-up" delay={280}>
          <div className="mt-3.5">
            <EmptyPanel
              title="Votre espace se remplira après le premier rendez-vous"
              desc="L'audit patrimonial permet à votre conseiller d'enregistrer vos actifs, de déposer vos documents et de formuler ses premières recommandations."
              action={{ href: "/espace/rendez-vous", label: "Prendre rendez-vous" }}
            />
          </div>
        </AnimateIn>
      )}
    </Panel>
  );
}
