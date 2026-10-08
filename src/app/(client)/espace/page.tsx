import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, Card, CardGrid, EmptyPanel, Badge } from "@/components/client/ui";
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
import { PARCOURS, etatEtape, libelleType } from "@/lib/parcours";
import { initials } from "@/components/client/espace-nav";

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

  // Le conseiller référent, en deux temps : son identifiant est sur le profil du
  // client, sa fiche est lisible grâce à la policy « Clients see their advisor
  // profile » (migration 018). Sans référent - ou sans migration - la carte ne
  // s'affiche simplement pas.
  const { data: moi } = await supabase
    .from("profiles")
    .select("advisor_id, first_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: conseiller } = moi?.advisor_id
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone, avatar_url")
        .eq("id", moi.advisor_id)
        .maybeSingle()
    : { data: null };

  const total = totalPatrimoine(assetRows);
  const classes = repartition(assetRows);
  const perf = performance12m(assetRows, valuations);
  const dominante = concentration(classes);
  const appointments = allAppointments ?? [];
  const cessions = dossiers ?? [];

  // L'étape en cours du parcours, pour l'annoncer en tête de page.
  const etats = PARCOURS.map((e) => etatEtape(e.type, appointments));
  const enCours =
    PARCOURS.find((_, i) => etats[i] === "encours") ?? PARCOURS.find((_, i) => etats[i] === "avenir");

  return (
    <Panel>
      <AnimateIn variant="fade-up">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[15px] text-warm-grey">Tableau de bord</p>
            <h1 className="display-lg mt-2 text-ink">Bonjour{moi?.first_name ? ` ${moi.first_name}` : ""}.</h1>
          </div>
          <Link href="/espace/rendez-vous" className="btn btn-ink btn-sm">
            Prendre rendez-vous
          </Link>
        </div>
      </AnimateIn>

      {/* Le parcours en tête : c'est la première chose qu'un client vient vérifier. */}
      <AnimateIn variant="fade-up" delay={80}>
        <Link
          href="/espace/accompagnement"
          className="group mt-10 block rounded-[24px] bg-ink p-6 text-cream transition-colors hover:bg-navy sm:p-8"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-[15px] text-cream-muted">
              Votre accompagnement
              {enCours && (
                <>
                  {" · "}
                  <span className="text-cream">
                    {enCours.type} {enCours.title}
                  </span>
                </>
              )}
            </p>
            <span className="text-[14px] text-cream-muted transition-colors group-hover:text-cream">Voir le détail →</span>
          </div>
          <ol className="mt-8 grid grid-cols-3 gap-3 sm:gap-6">
            {PARCOURS.map((etape, i) => {
              const state = etats[i];
              return (
                <li key={etape.type} className="min-w-0">
                  {/* Le trait porte l'avancement ; le texte dessous le nomme.
                      Franchie ou à venir doit se distinguer sans lire. */}
                  <div
                    className={`h-1 rounded-full ${
                      state === "fait" ? "bg-cream" : state === "encours" ? "bg-cream/55" : "bg-cream/15"
                    }`}
                  />
                  <p
                    className={`mt-4 font-heading text-[clamp(1.6rem,3vw,2.6rem)] font-light leading-none ${
                      state === "avenir" ? "text-cream/40" : "text-cream"
                    }`}
                  >
                    {etape.type}
                  </p>
                  <p className={`mt-2 truncate text-[14px] ${state === "avenir" ? "text-cream/40" : "text-cream-muted"}`}>
                    {etape.title}
                    {state === "encours" && <span className="text-cream"> · en cours</span>}
                  </p>
                  <span className="sr-only">
                    {state === "fait" ? "étape franchie" : state === "encours" ? "étape en cours" : "étape à venir"}
                  </span>
                </li>
              );
            })}
          </ol>
        </Link>
      </AnimateIn>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <AnimateIn variant="fade-up" delay={140} className="h-full">
          <Card className="h-full p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-[14px] text-warm-grey">Patrimoine suivi</p>
                <p className="mt-2 font-heading text-[clamp(2.2rem,4vw,3.25rem)] font-light leading-none tracking-[-0.02em] text-ink tabular-nums">
                  {assetRows.length ? formatMAD(total) : "-"}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[14px] text-warm-grey">Performance 12 mois</p>
                <p className={`mt-2 tabular-nums ${perf.percent === null ? "text-[15px] text-warm-grey" : "text-[20px] text-ink"}`}>
                  {perf.percent === null ? "Pas encore d’historique" : formatPercent(perf.percent)}
                </p>
                {perf.since && <p className="mt-1 text-[13px] text-warm-grey">Depuis le {formatDateLong(perf.since)}</p>}
              </div>
            </div>
            <div className="mt-8 border-t border-ink/[0.07] pt-6">
              {classes.length > 0 ? (
                <>
                  <RepartitionBar classes={classes} />
                  {dominante && (
                    // Un constat, pas une alerte : c'est au conseiller de
                    // qualifier si cette concentration pose problème.
                    <p className="mt-5 text-[14px] leading-relaxed text-charcoal">
                      <strong className="font-medium text-ink">{dominante.share.toFixed(0)} %</strong> de votre
                      patrimoine repose sur une seule classe d’actifs, {dominante.label.toLowerCase()}. Un point à
                      aborder avec votre conseiller.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[15px] leading-relaxed text-warm-grey">
                  Votre conseiller n’a pas encore enregistré vos actifs. La répartition apparaîtra ici dès le
                  premier audit patrimonial.
                </p>
              )}
            </div>
            <Link href="/espace/patrimoine" className="link-arrow mt-6 text-[14px]">
              Mon patrimoine en détail →
            </Link>
          </Card>
        </AnimateIn>

        <div className="flex flex-col gap-4">
          <AnimateIn variant="fade-up" delay={180}>
            <Card className="p-6 sm:p-7">
              <p className="text-[14px] text-warm-grey">Prochain rendez-vous</p>
              {nextAppointment ? (
                <>
                  <p className="mt-2 font-heading text-[30px] font-light leading-tight text-ink">
                    {formatDateShort(nextAppointment.date)}
                  </p>
                  <p className="mt-1 text-[15px] text-charcoal">{libelleType(nextAppointment.type)}</p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[16px] text-charcoal">Aucun rendez-vous planifié.</p>
                  <Link href="/espace/rendez-vous" className="link-arrow mt-3 text-[14px]">
                    Choisir un créneau →
                  </Link>
                </>
              )}
            </Card>
          </AnimateIn>

          {conseiller && (
            <AnimateIn variant="fade-up" delay={210} className="flex-1">
              <Card className="h-full p-6 sm:p-7">
                <p className="text-[14px] text-warm-grey">Votre conseiller</p>
                <div className="mt-4 flex items-center gap-4">
                  {conseiller.avatar_url ? (
                    // `unoptimized` : la photo vient du bucket public, dont le
                    // domaine n'est pas déclaré à l'optimiseur de Next.
                    <Image
                      src={conseiller.avatar_url}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                      className="size-16 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="grid size-16 shrink-0 place-items-center rounded-full bg-ink font-heading text-[20px] text-cream"
                    >
                      {initials(conseiller.first_name, conseiller.last_name, conseiller.email)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-medium text-ink">
                      {[conseiller.first_name, conseiller.last_name].filter(Boolean).join(" ") || "Votre conseiller"}
                    </p>
                    {conseiller.email && (
                      <a href={`mailto:${conseiller.email}`} className="block truncate text-[14px] text-charcoal hover:text-ink">
                        {conseiller.email}
                      </a>
                    )}
                    {conseiller.phone && (
                      <a href={`tel:${conseiller.phone}`} className="block text-[14px] text-warm-grey tabular-nums hover:text-ink">
                        {conseiller.phone}
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            </AnimateIn>
          )}
        </div>
      </div>

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-3">
          <h2 className="display-sm text-ink">À étudier</h2>
          <Link href="/espace/recommandations" className="link-arrow text-[14px]">
            Toutes mes recommandations →
          </Link>
        </div>
        {recos && recos.length > 0 ? (
          <CardGrid min="260px">
            {recos.map((r) => {
              const reco = Array.isArray(r.recommendations) ? r.recommendations[0] : r.recommendations;
              if (!reco) return null;
              return (
                <Link
                  key={r.id}
                  href={`/espace/recommandations/${reco.id}`}
                  className="group flex h-full flex-col rounded-[20px] bg-white p-6 ring-1 ring-ink/[0.07] transition-shadow hover:ring-ink/20"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-warm-grey">{reco.category}</span>
                    <Badge tone="attente">À étudier</Badge>
                  </div>
                  <span className="mt-5 flex-1 font-heading text-[21px] font-light leading-snug text-ink">{reco.title}</span>
                  <span className="mt-5 text-[14px] text-charcoal group-hover:text-ink">Lire et comprendre →</span>
                </Link>
              );
            })}
          </CardGrid>
        ) : (
          <p className="rounded-[20px] bg-white p-6 text-[15px] text-warm-grey ring-1 ring-ink/[0.07]">
            Rien ne requiert votre attention pour l’instant. Les recommandations de votre conseiller apparaîtront
            ici.
          </p>
        )}
      </section>

      {cessions.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="display-sm text-ink">Dossiers de cession en cours</h2>
            <Link href="/espace/ceder" className="link-arrow text-[14px]">
              Tous mes dossiers →
            </Link>
          </div>
          <CardGrid min="240px">
            {cessions.map((c) => (
              <Card key={c.id} className="flex h-full flex-col p-6">
                <div className="mb-2 flex items-start gap-2.5">
                  <span className="min-w-0 flex-1 text-[16px] font-medium text-ink">{c.asset_type}</span>
                  <Badge tone="attente">{c.status === "en_revue" ? "En revue" : "Soumis"}</Badge>
                </div>
                <div className="flex-1 text-[13px] text-warm-grey">Déposé le {formatDateLong(c.created_at)}</div>
                {c.estimated_value ? (
                  <div className="mt-4 font-heading text-[24px] font-light text-ink tabular-nums">
                    {formatMAD(Number(c.estimated_value))}
                  </div>
                ) : null}
              </Card>
            ))}
          </CardGrid>
        </section>
      )}

      {assetRows.length === 0 && !nextAppointment && (
        <AnimateIn variant="fade-up" delay={280}>
          <div className="mt-12">
            <EmptyPanel
              title="Votre espace se remplira après le premier rendez-vous"
              desc="L’audit patrimonial permet à votre conseiller d’enregistrer vos actifs, de déposer vos documents et de formuler ses premières recommandations."
              action={{ href: "/espace/rendez-vous", label: "Prendre rendez-vous" }}
            />
          </div>
        </AnimateIn>
      )}
    </Panel>
  );
}
