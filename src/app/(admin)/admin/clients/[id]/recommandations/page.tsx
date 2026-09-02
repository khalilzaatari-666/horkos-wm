import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { AssignCreate } from "./assign-create";
import { AssignmentRowActions } from "./assignment-row-actions";
import { assignmentStatusLabel, assignmentStatusTone } from "@/lib/recommandation-status";

export const metadata: Metadata = { title: "Recommandations" };

/** PostgREST rend la relation en objet ou en tableau ; on normalise. */
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function ClientRecommandationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px]">
          Les recommandations proposées à ce client. Elles apparaissent dans son espace ; le mot du
          conseiller y est visible.
        </p>
        <AssignCreate clientId={id} options={options} />
      </div>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Recommandation", "Catégorie", "Statut", ""]}
          isEmpty={rows.length === 0}
          empty="Aucune recommandation proposée. Utilisez « Proposer une recommandation »."
        >
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-cream/40 transition-colors align-top">
              <Td>
                <div className="text-ink font-medium">{r.title}</div>
                {r.notes && (
                  <div className="text-[11.5px] text-warm-grey mt-0.5 line-clamp-1 max-w-[320px]">
                    {r.notes}
                  </div>
                )}
              </Td>
              <Td className="whitespace-nowrap text-charcoal">{r.category}</Td>
              <Td>
                <AdminBadge tone={assignmentStatusTone(r.status)}>
                  {assignmentStatusLabel(r.status)}
                </AdminBadge>
              </Td>
              <Td>
                <AssignmentRowActions
                  clientId={id}
                  assignment={{ id: r.id, status: r.status, notes: r.notes, title: r.title }}
                />
              </Td>
            </tr>
          ))}
        </AdminTable>
      </AnimateIn>
    </>
  );
}
