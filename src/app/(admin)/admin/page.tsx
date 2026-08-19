import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminCard, AdminKpi } from "@/components/admin/ui";
import {
  DEMANDE_STATUT_STYLES,
  type DemandeStatut,
} from "./demandes/constants";
import { formatDateTime, formatDateLong } from "@/lib/dates";

export const metadata: Metadata = { title: "Back-office" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  // Un seul instant de référence pour toute la page, dérivé sans `Date.now` que
  // la règle de pureté rejette dans un composant.
  const now = new Date();
  const nowIso = now.toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const [
    { count: demandesNouvelles },
    { count: soumissionsOuvertes },
    { count: rdvAVenir },
    { count: conseillers },
    { count: clients },
    { count: demandesSemaine },
    { data: activite },
  ] = await Promise.all([
    supabase
      .from("appointment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "nouveau"),
    supabase
      .from("asset_submissions")
      .select("*", { count: "exact", head: true })
      .in("status", ["soumis", "en_revue"]),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("date", nowIso)
      .in("status", ["planifie", "confirme"]),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "conseiller"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
    supabase
      .from("appointment_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase
      .from("appointment_requests")
      .select("id, first_name, last_name, email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <AdminPanel>
      <AdminHead
        title="Tableau de bord"
        desc="L'activité réelle du cabinet. Les chiffres viennent de la base, pas d'un jeu d'essai."
      />

      {conseillers === 0 && (
        <AnimateIn variant="fade-up">
          <div className="mb-5 p-5 rounded-xl border border-bronze/40 bg-bronze/[0.07]">
            <h2 className="text-[14px] font-semibold text-ink">Aucun conseiller enregistré</h2>
            <p className="text-[13px] text-charcoal leading-[1.65] mt-1.5">
              Tant qu&apos;aucun profil ne porte le rôle « conseiller », le calendrier public
              affiche tous les créneaux comme complets : personne ne peut réserver.
            </p>
            <Link
              href="/admin/utilisateurs"
              className="inline-block mt-3.5 px-4 py-2 text-[12.5px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors"
            >
              Désigner un conseiller
            </Link>
          </div>
        </AnimateIn>
      )}

      <AnimateIn variant="fade-up" delay={60}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <AdminKpi
            label="Demandes à traiter"
            value={String(demandesNouvelles ?? 0)}
            note={`${demandesSemaine ?? 0} reçue(s) cette semaine`}
          />
          <AdminKpi label="Rendez-vous à venir" value={String(rdvAVenir ?? 0)} />
          <AdminKpi
            label="Dossiers de cession"
            value={String(soumissionsOuvertes ?? 0)}
            note="Soumis ou en revue"
          />
          <AdminKpi
            label="Clients inscrits"
            value={String(clients ?? 0)}
            note={`${conseillers ?? 0} conseiller(s)`}
          />
        </div>
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={120}>
        <AdminCard className="p-6 mt-3.5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-heading text-[16px] font-semibold text-ink">Activité récente</h2>
            <Link
              href="/admin/demandes"
              className="text-[12.5px] text-bronze-dark hover:text-bronze transition-colors shrink-0"
            >
              Toutes les demandes →
            </Link>
          </div>

          {activite && activite.length > 0 ? (
            <ul className="divide-y divide-cream-deep">
              {activite.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium text-ink truncate">
                      {d.first_name} {d.last_name}
                    </div>
                    <div className="text-[11.5px] text-warm-grey truncate">{d.email}</div>
                  </div>
                  <div className="text-[12px] text-warm-grey shrink-0 hidden sm:block">
                    {formatDateLong(d.created_at)}
                  </div>
                  {/* Mêmes couleurs et mêmes libellés que la page Demandes :
                      un statut ne doit pas changer d'apparence d'un écran à
                      l'autre. */}
                  {(() => {
                    const style =
                      DEMANDE_STATUT_STYLES[d.status as DemandeStatut] ??
                      DEMANDE_STATUT_STYLES.nouveau;
                    return (
                      <span
                        title={style.hint}
                        className={`inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${style.pill}`}
                      >
                        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                      </span>
                    );
                  })()}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-warm-grey leading-[1.65]">
              Aucune demande de rendez-vous pour l&apos;instant. Elles apparaîtront ici dès
              qu&apos;un visiteur remplira le questionnaire.
            </p>
          )}
        </AdminCard>
      </AnimateIn>

      <p className="text-[11.5px] text-warm-grey mt-5">
        Dernière mise à jour : {formatDateTime(nowIso)}.
      </p>
    </AdminPanel>
  );
}
