import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminCard, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";
import {
  PARCOURS,
  etatEtape,
  jalonSuivant,
  libelleType,
  type EtapeState,
} from "@/lib/parcours";
import { peutAccederAuDossier } from "@/lib/client-access";
import { RDV_STATUT_STYLES, type RdvStatut } from "../../../rendez-vous/constants";
import { RdvActions } from "./rdv-actions";
import { EtapeSuivanteButton } from "./etape-suivante";

export const metadata: Metadata = { title: "Suivi" };

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

const MODE_LABELS: Record<string, string> = {
  presentiel: "Au cabinet",
  visio: "En visio",
};

export default async function ClientSuiviPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  // Un seul instant de référence, comme sur le tableau de bord : `Date.now`
  // est rejeté par la règle de pureté des composants.
  const maintenant = new Date();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: client }, { data: me }, { data: rdvData }] = await Promise.all([
    supabase.from("profiles").select("advisor_id").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle(),
    supabase
      .from("appointments")
      .select("id, type, status, date, mode, meeting_url, notes, advisor_id")
      .eq("client_id", id)
      .order("date", { ascending: false }),
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

  const pilote = peutAccederAuDossier(
    { id: user.id, role: me?.role ?? "" },
    client.advisor_id ?? null
  );
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

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px]">
          Le parcours du client et tous ses rendez-vous, annulés compris. Le client voit le même
          parcours depuis « Mon accompagnement ».
        </p>
        {pilote && suivante && (
          <EtapeSuivanteButton clientId={id} etape={{ type: suivante.type, title: suivante.title }} />
        )}
        {pilote && !suivante && aCloturer && suivanteApresCloture && (
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
              const dernier = rdvs.filter((r) => r.type === etape.type)[0];
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
                    <AdminBadge tone={ETAT_TONES[state]}>{ETAT_LABELS[state]}</AdminBadge>
                  </div>
                  <div className="text-[13px] text-charcoal mt-1.5">{etape.title}</div>
                  <div className="text-[12px] text-warm-grey mt-1">
                    {dernier ? formatDateTime(dernier.date) : "Pas encore posée"}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Dire pourquoi rien n'est proposé vaut mieux qu'une absence de bouton. */}
          <p className="text-[12.5px] text-warm-grey leading-[1.6] mt-4">
            {!pilote
              ? "Lecture seule : ce dossier est piloté par son conseiller référent."
              : suivante
                ? `Étape à poser : ${suivante.type} - ${suivante.title}.`
                : aCloturer && suivanteApresCloture
                  ? `Le ${aCloturer.type} est passé sans être clos. Planifier le ${suivanteApresCloture.type} le marquera terminé - c'est ce qui alimente le taux de rendez-vous honorés.`
                  : aCloturer
                    ? `Le ${aCloturer.type} est passé : marquez-le terminé ou annulé dans la liste ci-dessous.`
                    : "Rien à planifier : l'étape suivante est déjà posée, ou le parcours est complet."}
          </p>
        </AdminCard>
      </AnimateIn>

      {/* Rendez-vous */}
      <AnimateIn variant="fade-up" delay={120}>
        <AdminTable
          headers={["Quand", "Étape", "Format", "Conseiller", "Statut", pilote ? "" : "Note"]}
          isEmpty={rdvs.length === 0}
          empty="Aucun rendez-vous. Le client peut en réserver un depuis son espace, ou vous posez ici la première étape."
        >
          {rdvs.map((r) => {
            const style = RDV_STATUT_STYLES[r.status as RdvStatut] ?? RDV_STATUT_STYLES.planifie;
            return (
              <tr key={r.id} className="hover:bg-cream/40 transition-colors align-top">
                <Td className="whitespace-nowrap">
                  <div className="font-medium text-ink">{formatDateTime(r.date)}</div>
                  {r.notes && (
                    <div className="text-[12px] text-warm-grey mt-1 max-w-[260px] whitespace-normal">
                      {r.notes}
                    </div>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  <div className="text-ink">{libelleType(r.type)}</div>
                  <span className="inline-block text-[11px] font-semibold text-charcoal bg-cream border border-cream-deep px-1.5 py-0.5 rounded mt-1">
                    {r.type}
                  </span>
                </Td>
                <Td className="whitespace-nowrap">
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
                <Td className="whitespace-nowrap text-warm-grey">
                  {r.advisor_id ? (advisorName.get(r.advisor_id) ?? "-") : "-"}
                </Td>
                <Td className="whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium border px-2 py-1 rounded ${style.pill}`}
                  >
                    <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </Td>
                <Td>
                  {pilote ? (
                    <RdvActions clientId={id} id={r.id} status={r.status} />
                  ) : (
                    <span className="text-warm-grey">-</span>
                  )}
                </Td>
              </tr>
            );
          })}
        </AdminTable>
      </AnimateIn>
    </>
  );
}
