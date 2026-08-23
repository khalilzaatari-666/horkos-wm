import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminCard, AdminKpi } from "@/components/admin/ui";
import { RDV_STATUT_STYLES, type RdvStatut } from "./rendez-vous/constants";
import { formatDateTime, formatDateLong } from "@/lib/dates";

export const metadata: Metadata = { title: "Back-office" };

type NomPartiel = { first_name: string | null; last_name: string | null };

/** PostgREST rend une relation en objet ou en tableau selon la cardinalité inférée. */
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function fullName(p: NomPartiel | null): string {
  if (!p) return "";
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  // Un seul instant de référence pour toute la page, dérivé sans `Date.now` que
  // la règle de pureté rejette dans un composant.
  const now = new Date();
  const nowIso = now.toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const [
    { count: rdvAVenir },
    { count: reservesSemaine },
    { count: soumissionsOuvertes },
    { count: conseillers },
    { count: clients },
    { data: activite },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("date", nowIso)
      .in("status", ["planifie", "confirme"]),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase
      .from("asset_submissions")
      .select("*", { count: "exact", head: true })
      .in("status", ["soumis", "en_revue"]),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "conseiller"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
    // Derniers rendez-vous réservés. Le nom vient du compte s'il existe, sinon
    // du questionnaire (relation inverse appointment_requests.appointment_id).
    supabase
      .from("appointments")
      .select(
        "id, type, status, date, created_at, " +
          "client:client_id(first_name, last_name), " +
          "demande:appointment_requests!appointment_id(first_name, last_name)"
      )
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const recents = ((activite ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    type: r.type as string,
    status: r.status as string,
    date: r.date as string,
    name:
      fullName(one(r.client as NomPartiel)) ||
      fullName(one(r.demande as NomPartiel)) ||
      "Visiteur sans compte",
  }));

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
          <AdminKpi label="Rendez-vous à venir" value={String(rdvAVenir ?? 0)} />
          <AdminKpi
            label="Réservés cette semaine"
            value={String(reservesSemaine ?? 0)}
            note="7 derniers jours"
          />
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
            <h2 className="font-heading text-[16px] font-semibold text-ink">
              Derniers rendez-vous
            </h2>
            <Link
              href="/admin/rendez-vous"
              className="text-[12.5px] text-bronze-dark hover:text-bronze transition-colors shrink-0"
            >
              Tous les rendez-vous →
            </Link>
          </div>

          {recents.length > 0 ? (
            <ul className="divide-y divide-cream-deep">
              {recents.map((r) => {
                const style =
                  RDV_STATUT_STYLES[r.status as RdvStatut] ?? RDV_STATUT_STYLES.planifie;
                return (
                  <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-ink truncate">{r.name}</div>
                      <div className="text-[11.5px] text-warm-grey">
                        {r.type} · {formatDateLong(r.date)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${style.pill}`}
                    >
                      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {style.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-warm-grey leading-[1.65]">
              Aucun rendez-vous pour l&apos;instant. Ils apparaîtront ici dès qu&apos;un visiteur
              réservera un créneau sur le site.
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
