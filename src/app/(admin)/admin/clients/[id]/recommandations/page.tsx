import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminCard, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { AssignCreate } from "./assign-create";
import { AssignmentRowActions } from "./assignment-row-actions";
import {
  ASSIGNMENT_STATUS,
  assignmentStatusLabel,
  assignmentStatusTone,
} from "@/lib/recommandation-status";
import { grouperParCategorie } from "@/lib/recommandation-categories";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { param, pick, sensDe, recherche, trier, contient } from "@/lib/liste";

export const metadata: Metadata = { title: "Recommandations" };

/** PostgREST rend la relation en objet ou en tableau ; on normalise. */
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

const TRIS = ["recommandation", "statut"] as const;
const STATUTS = ASSIGNMENT_STATUS.map((s) => s.value);

export default async function ClientRecommandationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "recommandation")!;
  const sens = sensDe(param(raw, "sens"));
  const statut = pick(param(raw, "statut"), STATUTS, null);
  const q = recherche(raw);
  const supabase = await createClient();

  const [{ data: assigned }, { data: catalogue }] = await Promise.all([
    supabase
      .from("client_recommendations")
      .select("id, status, notes, created_at, recommendations(id, title, category)")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("recommendations")
      .select("id, title, category")
      .eq("is_active", true)
      .order("category", { ascending: true }),
  ]);

  type Reco = { id: string; title: string; category: string };
  const rows = (assigned ?? []).map((r) => {
    const reco = one(r.recommendations as unknown as Reco | Reco[]);
    return {
      id: r.id,
      status: r.status,
      notes: r.notes ?? "",
      title: reco?.title ?? "Recommandation",
      category: reco?.category ?? "",
    };
  });

  const options = (catalogue ?? []).map((c) => ({ id: c.id, title: c.title, category: c.category }));

  const retenues = trier(
    rows.filter(
      (r) =>
        (statut === null || r.status === statut) && contient([r.title, r.category, r.notes], q)
    ),
    (r) => (tri === "statut" ? assignmentStatusLabel(r.status) : r.title),
    sens,
    (r) => r.title
  );

  // Même classement que le coffre-fort et que l'espace client : le conseiller et
  // son client parcourent la liste par thème, pas par ordre d'attribution. Le
  // tri des en-têtes joue donc à l'intérieur d'une section.
  const groupes = grouperParCategorie(retenues, (r) => r.category);

  const qs = { statut: statut ?? undefined, q: q || undefined };

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px]">
          Les recommandations proposées à ce client. Elles apparaissent dans son espace ; le mot du
          conseiller y est visible.
        </p>
        <AssignCreate clientId={id} options={options} />
      </div>

      {rows.length > 0 && (
        <AnimateIn variant="fade-up" delay={40}>
          <FiltresListe
            champs={[
              {
                cle: "statut",
                aria: "Statut",
                toutes: "Tous les statuts",
                options: ASSIGNMENT_STATUS.map((s) => ({ value: s.value, label: s.label })),
              },
            ]}
            recherche={{ placeholder: "Rechercher une recommandation…" }}
            total={retenues.length}
            unite="recommandation"
          />
        </AnimateIn>
      )}

      {retenues.length === 0 ? (
        <AnimateIn variant="fade-up" delay={60}>
          <AdminCard className="p-10 text-center">
            <p className="text-[13.5px] text-warm-grey leading-[1.65] max-w-[440px] mx-auto">
              {q || statut
                ? "Aucune recommandation ne correspond à ces critères."
                : "Aucune recommandation proposée. Utilisez « Proposer une recommandation »."}
            </p>
          </AdminCard>
        </AnimateIn>
      ) : (
        <div className="space-y-7">
          {groupes.map((groupe, gi) => (
            <section key={groupe.categorie}>
              <AnimateIn variant="fade-up" delay={60 + gi * 50}>
                <h2 className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase mb-3">
                  {groupe.categorie}
                </h2>
                <AdminTable
                  headers={[
                    <TriHeader
                      key="reco"
                      label="Recommandation"
                      colonne="recommandation"
                      tri={tri}
                      sens={sens}
                      params={qs}
                    />,
                    // L'étiquette porte son propre `px-2.5` : sans ce décalage,
                    // « À étudier » commence dix pixels à droite de « Statut ».
                    <span key="statut" className="pl-2.5">
                      <TriHeader
                        label="Statut"
                        colonne="statut"
                        tri={tri}
                        sens={sens}
                        params={qs}
                      />
                    </span>,
                    "",
                  ]}
                  isEmpty={false}
                  empty=""
                >
                  {groupe.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-cream/40 transition-colors align-top">
                      {/* Chaque catégorie est un tableau distinct : sans
                          largeurs imposées, chacun calerait sa colonne Statut
                          sur la longueur de ses propres titres et les sections
                          ne s'aligneraient plus entre elles. */}
                      <Td className="w-full">
                        <div className="text-ink font-medium">{r.title}</div>
                        {r.notes && (
                          <div className="text-[11.5px] text-warm-grey mt-0.5 line-clamp-1 max-w-[320px]">
                            {r.notes}
                          </div>
                        )}
                      </Td>
                      {/* Assez large pour « Mise en place », la plus longue des
                          étiquettes : une largeur inférieure serait écrasée par
                          le contenu et le décalage reviendrait. */}
                      <Td className="w-[180px]">
                        <AdminBadge tone={assignmentStatusTone(r.status)}>
                          {assignmentStatusLabel(r.status)}
                        </AdminBadge>
                      </Td>
                      <Td className="w-px whitespace-nowrap">
                        <AssignmentRowActions
                          clientId={id}
                          assignment={{ id: r.id, status: r.status, notes: r.notes, title: r.title }}
                        />
                      </Td>
                    </tr>
                  ))}
                </AdminTable>
              </AnimateIn>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
