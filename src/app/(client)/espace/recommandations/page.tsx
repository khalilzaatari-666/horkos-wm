import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, PanelHead, Card, CardGrid, EmptyPanel, Badge } from "@/components/client/ui";
import { formatDateLong } from "@/lib/dates";
import { grouperParCategorie } from "@/lib/recommandation-categories";
import { ASSIGNMENT_STATUS, assignmentStatusLabel } from "@/lib/recommandation-status";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { param, pick, recherche, trier, instant, contient } from "@/lib/liste";

export const metadata: Metadata = { title: "Mes recommandations" };

/**
 * L'étiquette portée par chaque fiche. L'ordre de la liste sert aussi au
 * classement à l'intérieur d'une catégorie : ce qui attend une décision du
 * client passe devant ce qui est déjà tranché.
 *
 * Les libellés viennent de `recommandation-status`, comme au back-office : le
 * client et son conseiller doivent lire le même mot sur la même fiche. Seule la
 * teinte est propre à l'espace client, dont la palette n'a pas de `info`.
 */
const RANGS = [
  { status: "proposee", tone: "attente" as const },
  { status: "acceptee", tone: "succes" as const },
  { status: "mise_en_place", tone: "succes" as const },
  { status: "rejetee", tone: "neutre" as const },
];

/** Les catégories restent des sections ; le tri joue à l'intérieur de chacune. */
const ORDRES = [
  { value: "ancien", label: "De la plus ancienne" },
  { value: "titre", label: "Par titre" },
];
const STATUTS = ASSIGNMENT_STATUS.map((s) => s.value);

function statut(value: string) {
  const trouve = RANGS.find((s) => s.status === value);
  return trouve ? { ...trouve, label: assignmentStatusLabel(value) } : undefined;
}

interface Row {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  recommendations: { id: string; title: string; category: string; description: string | null } | null;
}

export default async function RecommandationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const ordre = pick(param(raw, "ordre"), ["ancien", "titre"] as const, null);
  const etat = pick(param(raw, "etat"), STATUTS, null);
  const q = recherche(raw);

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

  const retenues = rows.filter(
    (r) =>
      r.recommendations &&
      (etat === null || r.status === etat) &&
      contient([r.recommendations.title, r.recommendations.category, r.notes], q)
  );

  // Classées par catégorie comme les pièces du coffre-fort : c'est le sujet qui
  // rapproche deux recommandations dans la tête du client, pas leur statut - que
  // l'étiquette de chaque fiche continue d'indiquer.
  //
  // Sans tri explicite, l'ordre par défaut à l'intérieur d'une catégorie reste
  // celui des statuts : ce qui attend une décision du client passe devant.
  const rang = new Map(RANGS.map((s, i) => [s.status, i]));
  const groupes = grouperParCategorie(retenues, (r) => r.recommendations!.category).map((g) => ({
    ...g,
    rows:
      ordre === null
        ? [...g.rows].sort(
            (a, b) => (rang.get(a.status) ?? RANGS.length) - (rang.get(b.status) ?? RANGS.length)
          )
        : trier(
            g.rows,
            (r) => (ordre === "titre" ? r.recommendations!.title : instant(r.created_at)),
            "asc",
            (r) => r.recommendations!.title
          ),
  }));

  return (
    <Panel>
      <PanelHead
        eyebrow="Ce que nous vous proposons"
        title="Mes recommandations"
        desc="Chaque recommandation part d'un besoin identifié avec vous. Vous restez seul décisionnaire."
      />

      {rows.length > 0 && (
        <AnimateIn variant="fade-up" delay={60}>
          <FiltresListe
            champs={[
              {
                cle: "etat",
                aria: "Statut",
                toutes: "Tous les statuts",
                options: ASSIGNMENT_STATUS.map((s) => ({ value: s.value, label: s.label })),
              },
              { cle: "ordre", aria: "Ordre", toutes: "Ordre conseillé", options: ORDRES },
            ]}
            recherche={{ placeholder: "Rechercher une recommandation…" }}
            total={retenues.length}
            unite="recommandation"
          />
        </AnimateIn>
      )}

      {groupes.length === 0 ? (
        <AnimateIn variant="fade-up" delay={80}>
          <EmptyPanel
            title={
              rows.length > 0
                ? "Aucune recommandation ne correspond"
                : "Aucune recommandation pour l'instant"
            }
            desc={
              rows.length > 0
                ? "Changez de statut ou effacez la recherche pour retrouver vos fiches."
                : "Elles sont formulées après l'audit patrimonial, une fois votre situation et vos objectifs établis avec votre conseiller."
            }
          />
        </AnimateIn>
      ) : (
        <div className="space-y-8">
          {groupes.map((groupe, gi) => (
            <section key={groupe.categorie}>
              <AnimateIn variant="fade-up" delay={80 + gi * 60}>
                <h2 className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase mb-3">
                  {groupe.categorie}
                </h2>
                <CardGrid min="300px">
                  {groupe.rows.map((r) => {
                    const etat = statut(r.status);
                    return (
                    <Link key={r.id} href={`/espace/recommandations/${r.recommendations!.id}`}>
                      <Card
                        center
                        className="p-5 h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-bronze/40"
                      >
                        {etat && (
                          <div className="flex items-start justify-end mb-2">
                            <Badge tone={etat.tone}>{etat.label}</Badge>
                          </div>
                        )}
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
                    );
                  })}
                </CardGrid>
              </AnimateIn>
            </section>
          ))}
        </div>
      )}
    </Panel>
  );
}
