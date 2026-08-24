import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { parseDetails } from "@/lib/recommandation-details";
import { RecommendationCreate } from "./recommendation-create";
import { RecommendationRowActions } from "./recommendation-row-actions";

export const metadata: Metadata = { title: "Recommandations" };

export default async function RecommandationsCataloguePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("id, title, category, description, details, is_active, created_at")
    .order("created_at", { ascending: false });

  const rows = data ?? [];

  return (
    <AdminPanel>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <AdminHead
          title="Recommandations"
          desc="Le catalogue des recommandations proposables. Une recommandation active peut être attribuée à un client depuis son dossier."
        />
        <AnimateIn variant="fade-up">
          <RecommendationCreate />
        </AnimateIn>
      </div>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Titre", "Catégorie", "Statut", ""]}
          isEmpty={rows.length === 0}
          empty="Aucune recommandation. Créez la première avec « Nouvelle recommandation »."
        >
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-cream/40 transition-colors align-top">
              <Td className="text-ink font-medium">{r.title}</Td>
              <Td className="whitespace-nowrap text-charcoal">{r.category}</Td>
              <Td>
                <AdminBadge tone={r.is_active ? "succes" : "neutre"}>
                  {r.is_active ? "Active" : "Inactive"}
                </AdminBadge>
              </Td>
              <Td>
                <RecommendationRowActions
                  reco={{
                    id: r.id,
                    title: r.title,
                    category: r.category,
                    description: r.description ?? "",
                    is_active: r.is_active ?? false,
                    details: parseDetails(r.details),
                  }}
                />
              </Td>
            </tr>
          ))}
        </AdminTable>
      </AnimateIn>
    </AdminPanel>
  );
}
