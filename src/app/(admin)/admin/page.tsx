import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminCard, AdminKpi, AdminBadge } from "@/components/admin/ui";
import { RDV_STATUT_STYLES, type RdvStatut } from "./rendez-vous/constants";
import { formatDateTime, formatDateLong, formatRelative } from "@/lib/dates";

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

// ------------------------------------------------------------------
// Flux d'activité : plusieurs origines fondues en une seule frise.
// ------------------------------------------------------------------
type FeedKind = "inscription" | "demande" | "contact" | "cession" | "guide" | "partenariat";

const FEED_META: Record<FeedKind, { label: string; dot: string; href?: string }> = {
  inscription: { label: "Nouvelle inscription", dot: "bg-bronze", href: "/admin/utilisateurs" },
  demande: { label: "Demande de rendez-vous", dot: "bg-blue-500", href: "/admin/rendez-vous" },
  contact: { label: "Message de contact", dot: "bg-emerald-500" },
  cession: { label: "Dossier de cession", dot: "bg-amber-500", href: "/admin/soumissions" },
  guide: { label: "Guide téléchargé", dot: "bg-violet-500" },
  partenariat: { label: "Demande de partenariat", dot: "bg-rose-500" },
};

interface FeedItem {
  key: string;
  kind: FeedKind;
  who: string;
  at: string;
  detail?: string;
}

const ROLE_TONES: Record<string, "neutre" | "attente" | "succes" | "info"> = {
  client: "neutre",
  conseiller: "succes",
  admin: "info",
};

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
    { count: nouveauxInscrits },
    { count: conseillers },
    { count: clients },
    { count: partenairesNouveaux },
    { count: cessionsOuvertes },
    { count: contactsNouveaux },
    { count: guidesSemaine },
    { data: activite },
    { data: inscrits },
    { data: demandes },
    { data: contacts },
    { data: cessions },
    { data: guides },
    { data: partenaires },
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
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "conseiller"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
    supabase
      .from("partner_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "nouveau"),
    supabase
      .from("asset_submissions")
      .select("*", { count: "exact", head: true })
      .in("status", ["soumis", "en_revue"]),
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("status", "nouveau"),
    supabase
      .from("guide_downloads")
      .select("*", { count: "exact", head: true })
      .gte("sent_at", weekAgo),
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
    // Les sept prochaines origines nourrissent la frise ET les cartes latérales.
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("appointment_requests")
      .select("id, first_name, last_name, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("contacts")
      .select("id, name, subject, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("asset_submissions")
      .select("id, asset_type, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("guide_downloads")
      .select("id, email, sent_at")
      .order("sent_at", { ascending: false })
      .limit(6),
    supabase
      .from("partner_submissions")
      .select("id, name, company, created_at")
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

  const nouveaux = ((inscrits ?? []) as unknown as Record<string, unknown>[]).map((p) => ({
    id: p.id as string,
    name: fullName(p as NomPartiel) || (p.email as string) || "Compte sans nom",
    email: (p.email as string) ?? null,
    role: (p.role as string) ?? "client",
    created_at: p.created_at as string,
  }));

  // Fusion des origines : chaque ligne devient un FeedItem, puis on trie par
  // date décroissante et on ne garde que les plus récentes, tous flux confondus.
  const feed: FeedItem[] = [
    ...nouveaux.map((p) => ({
      key: `ins-${p.id}`,
      kind: "inscription" as const,
      who: p.name,
      at: p.created_at,
    })),
    ...((demandes ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
      key: `dem-${d.id as string}`,
      kind: "demande" as const,
      who: fullName(d as NomPartiel) || "Visiteur",
      at: d.created_at as string,
    })),
    ...((contacts ?? []) as unknown as Record<string, unknown>[]).map((c) => ({
      key: `con-${c.id as string}`,
      kind: "contact" as const,
      who: (c.name as string) || "Visiteur",
      at: c.created_at as string,
      detail: (c.subject as string) ?? undefined,
    })),
    ...((cessions ?? []) as unknown as Record<string, unknown>[]).map((s) => ({
      key: `ces-${s.id as string}`,
      kind: "cession" as const,
      who: (s.asset_type as string) || "Actif",
      at: s.created_at as string,
    })),
    ...((guides ?? []) as unknown as Record<string, unknown>[]).map((g) => ({
      key: `gui-${g.id as string}`,
      kind: "guide" as const,
      who: (g.email as string) || "Visiteur",
      at: g.sent_at as string,
    })),
    ...((partenaires ?? []) as unknown as Record<string, unknown>[]).map((p) => ({
      key: `par-${p.id as string}`,
      kind: "partenariat" as const,
      who: (p.name as string) || "Visiteur",
      at: p.created_at as string,
      detail: (p.company as string) ?? undefined,
    })),
  ]
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12);

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

      {/* Chiffres-clés. Première ligne : l'état du cabinet. Seconde : ce qui
          attend une action, cliquable et mis en avant dès qu'un compteur bouge. */}
      <AnimateIn variant="fade-up" delay={60}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <AdminKpi label="Rendez-vous à venir" value={String(rdvAVenir ?? 0)} href="/admin/rendez-vous" />
          <AdminKpi
            label="Réservés cette semaine"
            value={String(reservesSemaine ?? 0)}
            note="7 derniers jours"
            href="/admin/rendez-vous"
          />
          <AdminKpi
            label="Nouveaux inscrits"
            value={String(nouveauxInscrits ?? 0)}
            note="7 derniers jours"
            href="/admin/utilisateurs"
          />
          <AdminKpi
            label="Clients inscrits"
            value={String(clients ?? 0)}
            note={`${conseillers ?? 0} conseiller(s)`}
            href="/admin/utilisateurs"
          />
        </div>
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={90}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-3.5">
          <AdminKpi
            label="Demandes de partenariat"
            value={String(partenairesNouveaux ?? 0)}
            note="À traiter"
            emphasis={(partenairesNouveaux ?? 0) > 0}
          />
          <AdminKpi
            label="Dossiers de cession"
            value={String(cessionsOuvertes ?? 0)}
            note="Soumis ou en revue"
            href="/admin/soumissions"
            emphasis={(cessionsOuvertes ?? 0) > 0}
          />
          <AdminKpi
            label="Messages de contact"
            value={String(contactsNouveaux ?? 0)}
            note="Non traités"
            emphasis={(contactsNouveaux ?? 0) > 0}
          />
          <AdminKpi
            label="Guides téléchargés"
            value={String(guidesSemaine ?? 0)}
            note="7 derniers jours"
          />
        </div>
      </AnimateIn>

      {/* Frise d'activité (large) + derniers inscrits (étroit). */}
      <div className="grid lg:grid-cols-3 gap-3.5 mt-3.5">
        <AnimateIn variant="fade-up" delay={120} className="lg:col-span-2">
          <AdminCard className="p-6 h-full">
            <h2 className="font-heading text-[16px] font-semibold text-ink mb-4">
              Activité récente
            </h2>

            {feed.length > 0 ? (
              <ul className="space-y-0.5">
                {feed.map((e) => {
                  const meta = FEED_META[e.kind];
                  const row = (
                    <div className="flex items-start gap-3 py-2.5 rounded-lg -mx-2 px-2 transition-colors hover:bg-cream/50">
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${meta.dot}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-ink leading-snug">
                          <span className="font-medium">{meta.label}</span>
                          <span className="text-warm-grey"> · {e.who}</span>
                          {e.detail && <span className="text-warm-grey"> ({e.detail})</span>}
                        </div>
                        <div className="text-[11.5px] text-warm-grey mt-0.5">
                          {formatRelative(e.at, now)}
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <li key={e.key}>
                      {meta.href ? (
                        <Link href={meta.href} className="block">
                          {row}
                        </Link>
                      ) : (
                        row
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[13px] text-warm-grey leading-[1.65]">
                Aucune activité pour l&apos;instant. Inscriptions, demandes, messages et
                téléchargements s&apos;afficheront ici en temps réel.
              </p>
            )}
          </AdminCard>
        </AnimateIn>

        <AnimateIn variant="fade-up" delay={150}>
          <AdminCard className="p-6 h-full">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-heading text-[16px] font-semibold text-ink">
                Derniers inscrits
              </h2>
              <Link
                href="/admin/utilisateurs"
                className="text-[12.5px] text-bronze-dark hover:text-bronze transition-colors shrink-0"
              >
                Tous →
              </Link>
            </div>

            {nouveaux.length > 0 ? (
              <ul className="divide-y divide-cream-deep">
                {nouveaux.map((p) => (
                  <li key={p.id} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-ink truncate">{p.name}</div>
                      <div className="text-[11.5px] text-warm-grey">{formatRelative(p.created_at, now)}</div>
                    </div>
                    <AdminBadge tone={ROLE_TONES[p.role] ?? "neutre"}>{p.role}</AdminBadge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-warm-grey leading-[1.65]">
                Aucun compte enregistré pour l&apos;instant.
              </p>
            )}
          </AdminCard>
        </AnimateIn>
      </div>

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
