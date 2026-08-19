import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, PanelHead, Card, CardGrid, EmptyPanel, Badge } from "@/components/client/ui";
import { formatDateLong } from "@/lib/dates";

export const metadata: Metadata = { title: "Mes recommandations" };

/** Ordre d'affichage : ce qui attend le client d'abord. */
const GROUPES = [
  { status: "proposee", label: "À étudier", tone: "attente" as const },
  { status: "acceptee", label: "Acceptées", tone: "succes" as const },
  { status: "mise_en_place", label: "Mises en place", tone: "succes" as const },
  { status: "rejetee", label: "Écartées", tone: "neutre" as const },
];

interface Row {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  recommendations: { id: string; title: string; category: string; description: string | null } | null;
}

export default async function RecommandationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("client_recommendations")
    .select("id, status, notes, created_at, recommendations(id, title, category, description)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  // PostgREST renvoie la relation en objet ou en tableau selon la cardinalité
  // qu'il infère ; on normalise plutôt que de parier dessus.
  const rows: Row[] = (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    notes: r.notes,
    created_at: r.created_at,
    recommendations: Array.isArray(r.recommendations)
      ? (r.recommendations[0] ?? null)
      : (r.recommendations ?? null),
  }));

  const groupes = GROUPES.map((g) => ({
    ...g,
    rows: rows.filter((r) => r.status === g.status && r.recommendations),
  })).filter((g) => g.rows.length > 0);

  return (
    <Panel>
      <PanelHead
        eyebrow="Ce que nous vous proposons"
        title="Mes recommandations"
        desc="Chaque recommandation part d'un besoin identifié avec vous. Vous restez seul décisionnaire."
      />

      {groupes.length === 0 ? (
        <AnimateIn variant="fade-up" delay={80}>
          <EmptyPanel
            title="Aucune recommandation pour l'instant"
            desc="Elles sont formulées après l'audit patrimonial, une fois votre situation et vos objectifs établis avec votre conseiller."
          />
        </AnimateIn>
      ) : (
        <div className="space-y-8">
          {groupes.map((groupe, gi) => (
            <section key={groupe.status}>
              <AnimateIn variant="fade-up" delay={80 + gi * 60}>
                <h2 className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase mb-3">
                  {groupe.label}
                </h2>
                <CardGrid min="300px">
                  {groupe.rows.map((r) => (
                    <Link key={r.id} href={`/espace/recommandations/${r.recommendations!.id}`}>
                      <Card
                        center
                        className="p-5 h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-bronze/40"
                      >
                        <div className="flex items-start gap-2.5 mb-2">
                          <span className="text-[11px] font-semibold tracking-[1.2px] uppercase text-bronze-dark flex-1 min-w-0 truncate">
                            {r.recommendations!.category}
                          </span>
                          <Badge tone={groupe.tone}>{groupe.label}</Badge>
                        </div>
                        <h3 className="font-heading text-[17px] font-semibold text-ink leading-[1.3]">
                          {r.recommendations!.title}
                        </h3>
                        {r.recommendations!.description && (
                          <p className="text-[12.5px] text-warm-grey leading-[1.6] mt-2 line-clamp-3">
                            {r.recommendations!.description}
                          </p>
                        )}
                        <div className="text-[11.5px] text-warm-grey mt-3">
                          Proposée le {formatDateLong(r.created_at)}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </CardGrid>
              </AnimateIn>
            </section>
          ))}
        </div>
      )}
    </Panel>
  );
}
