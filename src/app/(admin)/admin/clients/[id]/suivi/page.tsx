import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminCard, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { formatDateTime } from "@/lib/dates";
import {
  PARCOURS,
  etatEtape,
  jalonSuivant,
  libelleType,
  refusChangement,
  type EtapeState,
} from "@/lib/parcours";
import { param, pick, sensDe, trier, instant } from "@/lib/liste";
import { RDV_STATUT_STYLES, type RdvStatut } from "../../../rendez-vous/constants";
import { RdvActions } from "./rdv-actions";
import { EtapeSuivanteButton } from "./etape-suivante";
import { RappelForm } from "./rappel-form";
import { annulerRappel, relancerRappel } from "./actions";
import { OuvrirFicheButton } from "../audits/ouvrir-fiche";
import { r0ARelancer } from "@/lib/rappels";

export const metadata: Metadata = { title: "Suivi" };

/** L'échéance d'un rappel se lit à l'heure du cabinet, pas à celle du serveur. */
const rappelFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Casablanca",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Au-delà, le cron cesse de réessayer : voir `app/api/cron/rappels`. */
const TENTATIVES_MAX = 5;

interface Rdv {
  id: string;
  type: string;
  status: string;
  date: string;
  mode: string | null;
  meeting_url: string | null;
  notes: string | null;
  advisor_id: string | null;
}

const ETAT_LABELS: Record<EtapeState, string> = {
  fait: "Franchie",
  encours: "En cours",
  avenir: "À venir",
};

const ETAT_TONES: Record<EtapeState, "succes" | "attente" | "neutre"> = {
  fait: "succes",
  encours: "attente",
  avenir: "neutre",
};

/**
 * « En cours » dit où en est le client, pas si le rendez-vous a eu lieu. Côté
 * cabinet on précise : encore à venir, ou passé et en attente de clôture.
 */
function badgeEtape(
  state: EtapeState,
  duType: Rdv[],
  maintenant: Date
): { label: string; tone: "succes" | "attente" | "neutre" | "info" } {
  if (state !== "encours") return { label: ETAT_LABELS[state], tone: ETAT_TONES[state] };
  const aVenir = duType.some(
    (r) =>
      (r.status === "planifie" || r.status === "confirme") &&
      new Date(r.date).getTime() > maintenant.getTime()
  );
  return aVenir ? { label: "Planifiée", tone: "info" } : { label: "À clôturer", tone: "attente" };
}

/**
 * Le rendez-vous qui représente l'étape sur sa carte : celui qui l'a franchie,
 * sinon celui qui est posé, sinon le plus récent. Le plus récent seul ferait
 * afficher un R0 annulé à la place du R0 tenu qui porte la fiche d'audit.
 */
function repereEtape(duType: Rdv[]): Rdv | undefined {
  return (
    duType.find((r) => r.status === "termine") ??
    duType.find((r) => r.status === "planifie" || r.status === "confirme") ??
    duType[0]
  );
}

/** Les statuts vers lesquels une ligne peut basculer : voir `RdvActions`. */
const CIBLES = ["confirme", "termine", "non_honore", "annule"] as const;

const MODE_LABELS: Record<string, string> = {
  presentiel: "Au cabinet",
  visio: "En visio",
};

const TRIS = ["quand", "etape", "statut"] as const;
const STATUTS = ["planifie", "confirme", "termine", "non_honore", "annule"] as const;

export default async function ClientSuiviPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "quand")!;
  const sens = sensDe(param(raw, "sens"), tri === "quand" ? "desc" : "asc");
  const statut = pick(param(raw, "statut"), STATUTS, null);
  const supabase = await createClient();
  // Un seul instant de référence, comme sur le tableau de bord : `Date.now`
  // est rejeté par la règle de pureté des composants.
  const maintenant = new Date();

  // Le droit d'entrée est vérifié par le layout du dossier (`peutAccederAuDossier`) :
  // qui arrive ici pilote ce dossier, et les actions le revérifient.
  const [{ data: client }, { data: rdvData }, { data: auditData }, { data: rappelData }] =
    await Promise.all([
      supabase.from("profiles").select("advisor_id").eq("id", id).maybeSingle(),
      supabase
        .from("appointments")
        .select("id, type, status, date, mode, meeting_url, notes, advisor_id")
        .eq("client_id", id)
        .order("date", { ascending: false }),
      // Les fiches d'audit, pour savoir si le R0 a déjà la sienne - et si elle
      // est clôturée, ce qui conditionne le rappel de relance.
      supabase.from("audits").select("id, appointment_id, status").eq("client_id", id),
      // Les rappels, en attente et envoyés : les premiers se gèrent, les seconds
      // disent quand le cabinet a relancé pour la dernière fois.
      supabase
        .from("reminders")
        .select("id, etape, status, due_at, sent_at, note, attempts, last_error, calendar_event_id")
        .eq("client_id", id)
        .in("status", ["en_attente", "envoye"])
        .order("sent_at", { ascending: false }),
    ]);

  if (!client) notFound();

  // Les annulés restent affichés ici, à l'inverse de l'espace client : côté
  // cabinet, un rendez-vous qui n'a pas eu lieu fait partie de l'histoire du
  // dossier.
  const rdvs: Rdv[] = rdvData ?? [];

  // Un seul aller-retour pour les noms de conseillers, sur les seuls ids
  // réellement présents.
  const advisorIds = [...new Set(rdvs.map((r) => r.advisor_id).filter((v): v is string => !!v))];
  const { data: advisorRows } = advisorIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", advisorIds)
    : { data: [] };

  const advisorName = new Map(
    (advisorRows ?? []).map((a) => [
      a.id,
      [a.first_name, a.last_name].filter(Boolean).join(" ") || "Conseiller",
    ])
  );

  // La fiche d'audit se remplit au R0 : on la retrouve par le rendez-vous
  // auquel elle est rattachée.
  const ficheParRdv = new Map(
    (auditData ?? [])
      .filter((a): a is { id: string; appointment_id: string; status: string } => !!a.appointment_id)
      .map((a) => [a.appointment_id, { id: a.id, status: a.status }])
  );

  // En attente : un seul par étape, c'est l'index unique partiel de la
  // migration 029 qui le garantit.
  const rappels = rappelData ?? [];
  const rappelParEtape = new Map(
    rappels.filter((r) => r.status === "en_attente").map((r) => [r.etape as string, r])
  );
  const derniereRelance = (etape: string) =>
    rappels.find((r) => r.etape === etape && r.status === "envoye" && r.sent_at)?.sent_at as
      | string
      | undefined;

  const suivante = jalonSuivant(rdvs);

  // L'étape en cours dont l'heure est passée : elle a très probablement eu lieu,
  // mais rien ne l'atteste tant que personne ne le dit. Plutôt que de réclamer
  // deux clics à deux endroits - marquer, puis planifier - on propose le geste
  // qui a du sens pour le conseiller : convenir de la suite. La clôture suit.
  const enCours = PARCOURS.find((e) => etatEtape(e.type, rdvs) === "encours");
  const aCloturer = enCours
    ? rdvs.find(
        (r) =>
          r.type === enCours.type &&
          (r.status === "planifie" || r.status === "confirme") &&
          new Date(r.date).getTime() < maintenant.getTime()
      )
    : undefined;

  // Ce que deviendrait le parcours une fois ce rendez-vous clos.
  const suivanteApresCloture = aCloturer
    ? jalonSuivant(rdvs.map((r) => (r.id === aCloturer.id ? { ...r, status: "termine" } : r)))
    : null;

  // Le tableau se trie et se filtre ; le parcours au-dessus, lui, garde
  // `rdvs` en entier. Un filtre d'affichage ne doit pas faire croire qu'une
  // étape n'a pas eu lieu.
  const lignes = trier(
    rdvs.filter((r) => statut === null || r.status === statut),
    (r) => (tri === "etape" ? r.type : tri === "statut" ? r.status : instant(r.date)),
    sens,
    (r) => r.date
  );

  const qs = { statut: statut ?? undefined };

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px]">
          Le parcours du client et tous ses rendez-vous, annulés compris. Le client voit le même
          parcours depuis « Mon accompagnement ».
        </p>
        {suivante && (
          <EtapeSuivanteButton clientId={id} etape={{ type: suivante.type, title: suivante.title }} />
        )}
        {!suivante && aCloturer && suivanteApresCloture && (
          <EtapeSuivanteButton
            clientId={id}
            etape={{ type: suivanteApresCloture.type, title: suivanteApresCloture.title }}
            cloture={{ id: aCloturer.id, type: aCloturer.type }}
          />
        )}
      </div>

      {/* Succession du parcours */}
      <AnimateIn variant="fade-up" delay={60}>
        <AdminCard className="p-5 sm:p-6 mb-5">
          <h2 className="font-heading text-[17.5px] font-semibold text-ink mb-4">Parcours</h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {PARCOURS.map((etape, i) => {
              const state = etatEtape(etape.type, rdvs);
              const duType = rdvs.filter((r) => r.type === etape.type);
              const dernier = repereEtape(duType);
              const relanceLe = derniereRelance(etape.type);
              const badge = badgeEtape(state, duType, maintenant);
              return (
                <li
                  key={etape.type}
                  className={`rounded-lg border p-4 ${
                    state === "avenir" ? "border-cream-deep bg-cream/40" : "border-bronze/30 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading text-[15px] font-semibold text-ink">
                      {i + 1}. {etape.type}
                    </span>
                    <AdminBadge tone={badge.tone}>{badge.label}</AdminBadge>
                  </div>
                  <div className="text-[13px] text-charcoal mt-1.5">{etape.title}</div>
                  <div className="text-[12px] text-warm-grey mt-1">
                    {dernier
                      ? formatDateTime(dernier.date) +
                        (dernier.status === "annule" || dernier.status === "non_honore"
                          ? ` · ${RDV_STATUT_STYLES[dernier.status].label.toLowerCase()}`
                          : "")
                      : "Pas encore posée"}
                  </div>
                  {relanceLe && (
                    <div className="text-[11.5px] text-warm-grey mt-0.5">
                      Dernière relance envoyée le {rappelFmt.format(new Date(relanceLe))}
                    </div>
                  )}
                  {/* La fiche d'audit se remplit au R0 : le conseiller la trouve
                      sur l'étape qui la produit, pas dans un autre onglet. Elle
                      s'ouvre à l'heure du rendez-vous, pas avant ; un R0 annulé
                      n'en produit pas. */}
                  {etape.type === "R0" && dernier && (
                    <div className="mt-3">
                      {(() => {
                        const fiche = ficheParRdv.get(dernier.id);
                        if (fiche) {
                          return (
                            <Link
                              href={`/admin/clients/${id}/audits/${fiche.id}`}
                              className="text-[12.5px] font-medium text-bronze-dark hover:text-bronze transition-colors"
                            >
                              {fiche.status === "termine"
                                ? "Fiche d'audit clôturée →"
                                : "Fiche d'audit en cours →"}
                            </Link>
                          );
                        }
                        if (dernier.status === "annule" || dernier.status === "non_honore") {
                          return null;
                        }
                        if (new Date(dernier.date).getTime() > maintenant.getTime()) {
                          return (
                            <span className="text-[12px] text-warm-grey">
                              Fiche d&apos;audit disponible à l&apos;heure du rendez-vous.
                            </span>
                          );
                        }
                        return (
                          <OuvrirFicheButton
                            clientId={id}
                            appointmentId={dernier.id}
                            libelle="Ouvrir la fiche d'audit"
                          />
                        );
                      })()}
                    </div>
                  )}

                  {/* Le rappel de R0 : client inscrit sans rendez-vous, qui ne
                      veut pas encore de R0, R0 annulé ou passé sans avoir eu
                      lieu. La balle est dans le camp du cabinet. */}
                  {etape.type === "R0" && (() => {
                    const rappel = rappelParEtape.get("R0");
                    if (rappel) return <RappelEnAttente clientId={id} rappel={rappel} />;
                    if (!r0ARelancer(rdvs, maintenant)) return null;
                    return (
                      <div className="pt-3 mt-3 border-t border-cream-deep">
                        <RappelForm clientId={id} etape="R0" />
                      </div>
                    );
                  })()}

                  {/* La relance du R1 : une fois le R0 tenu et son audit rendu,
                      c'est au cabinet de reprendre contact pour la stratégie. */}
                  {etape.type === "R1" && (() => {
                    const rappel = rappelParEtape.get("R1");
                    if (rappel) return <RappelEnAttente clientId={id} rappel={rappel} />;
                    const r0Tenu = rdvs.find((r) => r.type === "R0" && r.status === "termine");
                    if (state !== "avenir" || !r0Tenu) return null;
                    // Dire ce qui manque plutôt que de taire le formulaire.
                    if (ficheParRdv.get(r0Tenu.id)?.status !== "termine") {
                      return (
                        <p className="pt-3 mt-3 border-t border-cream-deep text-[12px] text-warm-grey leading-[1.55]">
                          {ficheParRdv.has(r0Tenu.id)
                            ? "Clôturez la fiche d'audit du R0 pour programmer la relance R1."
                            : "Ouvrez puis clôturez la fiche d'audit du R0 pour programmer la relance R1."}
                        </p>
                      );
                    }
                    return (
                      <div className="pt-3 mt-3 border-t border-cream-deep">
                        <RappelForm clientId={id} etape="R1" appointmentId={r0Tenu.id} />
                      </div>
                    );
                  })()}
                </li>
              );
            })}
          </ol>

          {/* Dire pourquoi rien n'est proposé vaut mieux qu'une absence de bouton. */}
          <p className="text-[12.5px] text-warm-grey leading-[1.6] mt-4">
            {suivante
              ? `Étape à poser : ${suivante.type} - ${suivante.title}.`
              : aCloturer && suivanteApresCloture
                ? `Le ${aCloturer.type} est passé sans être clos. S'il a eu lieu, planifier le ${suivanteApresCloture.type} le marquera terminé ; sinon, marquez-le « Absent » dans la liste ci-dessous. C'est ce qui alimente le taux de rendez-vous honorés.`
                : aCloturer
                  ? `Le ${aCloturer.type} est passé : marquez-le terminé, absent ou annulé dans la liste ci-dessous.`
                  : "Rien à planifier : l'étape suivante est déjà posée, ou le parcours est complet."}
          </p>
        </AdminCard>
      </AnimateIn>

      {/* Rendez-vous */}
      {rdvs.length > 0 && (
        <AnimateIn variant="fade-up" delay={110}>
          <FiltresListe
            champs={[
              {
                cle: "statut",
                aria: "Statut",
                toutes: "Tous les statuts",
                options: STATUTS.map((v) => ({ value: v, label: RDV_STATUT_STYLES[v].label })),
              },
            ]}
            total={lignes.length}
            unite="rendez-vous"
          />
        </AnimateIn>
      )}

      <AnimateIn variant="fade-up" delay={120}>
        <AdminTable
          headers={[
            <TriHeader
              key="q"
              label="Quand"
              colonne="quand"
              tri={tri}
              sens={sens}
              params={qs}
              sensInitial="desc"
            />,
            <TriHeader key="e" label="Étape" colonne="etape" tri={tri} sens={sens} params={qs} />,
            "Format",
            "Conseiller",
            <TriHeader key="s" label="Statut" colonne="statut" tri={tri} sens={sens} params={qs} />,
            "",
          ]}
          isEmpty={lignes.length === 0}
          empty={
            statut
              ? "Aucun rendez-vous dans cet état."
              : "Aucun rendez-vous. Le client peut en réserver un depuis son espace, ou vous posez ici la première étape."
          }
        >
          {lignes.map((r) => {
            const style = RDV_STATUT_STYLES[r.status as RdvStatut] ?? RDV_STATUT_STYLES.planifie;
            return (
              <tr key={r.id} className="hover:bg-cream/40 transition-colors align-top">
                <Td className="whitespace-nowrap min-w-[260px]">
                  <div className="font-medium text-ink">{formatDateTime(r.date)}</div>
                  {r.notes && (
                    <div className="text-[12px] text-warm-grey mt-1 max-w-[340px] whitespace-normal">
                      {r.notes}
                    </div>
                  )}
                </Td>
                <Td className="whitespace-nowrap min-w-[300px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-charcoal bg-cream border border-cream-deep px-1.5 py-0.5 rounded">
                      {r.type}
                    </span>
                    <span className="text-ink">{libelleType(r.type)}</span>
                  </div>
                </Td>
                <Td className="whitespace-nowrap min-w-[160px]">
                  {r.mode === "visio" && r.meeting_url ? (
                    <a
                      href={r.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bronze-dark hover:text-bronze transition-colors"
                    >
                      Visio - rejoindre
                    </a>
                  ) : (
                    (MODE_LABELS[r.mode ?? ""] ?? "-")
                  )}
                </Td>
                <Td className="whitespace-nowrap min-w-[180px] text-warm-grey">
                  {r.advisor_id ? (advisorName.get(r.advisor_id) ?? "-") : "-"}
                </Td>
                <Td className="whitespace-nowrap min-w-[150px]">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium border px-2 py-1 rounded ${style.pill}`}
                  >
                    <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </Td>
                <Td>
                  <RdvActions
                    clientId={id}
                    id={r.id}
                    type={r.type}
                    status={r.status}
                    refus={Object.fromEntries(
                      CIBLES.map((c) => [c, refusChangement(rdvs, r.id, c, maintenant)])
                    )}
                  />
                </Td>
              </tr>
            );
          })}
        </AdminTable>
      </AnimateIn>
    </>
  );
}

/** Un rappel posé, pas encore parti : échéance, note, et de quoi y renoncer. */
function RappelEnAttente({
  clientId,
  rappel,
}: {
  clientId: string;
  rappel: {
    id: string;
    due_at: string;
    note: string | null;
    attempts: number;
    last_error: string | null;
    calendar_event_id: string | null;
  };
}) {
  return (
    <div className="mt-3 pt-3 border-t border-cream-deep">
      <div className="text-[12.5px] text-ink">
        Relance prévue le {rappelFmt.format(new Date(rappel.due_at))}
      </div>
      {rappel.note && (
        <div className="text-[11.5px] text-warm-grey mt-0.5">« {rappel.note} »</div>
      )}
      {rappel.calendar_event_id && (
        <div className="text-[11.5px] text-warm-grey mt-0.5">
          Inscrite dans l&apos;agenda du référent.
        </div>
      )}
      {rappel.attempts >= TENTATIVES_MAX && (
        <div className="text-[11.5px] text-red-600 mt-1">
          Envoi impossible après {TENTATIVES_MAX} tentatives
          {rappel.last_error ? ` : ${rappel.last_error}` : "."}
        </div>
      )}
      <div className="flex items-center gap-3 mt-1.5">
        {rappel.attempts >= TENTATIVES_MAX && (
          <form action={relancerRappel}>
            <input type="hidden" name="id" value={rappel.id} />
            <input type="hidden" name="clientId" value={clientId} />
            <button
              type="submit"
              className="text-[12px] font-medium text-bronze-dark hover:text-bronze transition-colors cursor-pointer"
            >
              Réessayer l&apos;envoi
            </button>
          </form>
        )}
        <form action={annulerRappel}>
          <input type="hidden" name="id" value={rappel.id} />
          <input type="hidden" name="clientId" value={clientId} />
          <button
            type="submit"
            className="text-[12px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
          >
            Annuler le rappel
          </button>
        </form>
      </div>
    </div>
  );
}
