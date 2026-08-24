import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, PanelHead, CardGrid, EmptyPanel } from "@/components/client/ui";
import { DocumentRow } from "@/components/client/document-row";
import { formatDateLong } from "@/lib/dates";
import { DOCUMENT_RUBRIQUES as RUBRIQUES } from "@/lib/documents";

export const metadata: Metadata = { title: "Coffre-fort" };

export default async function CoffrePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("documents")
    .select("id, category, name, file_size, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const documents = data ?? [];
  const remplies = RUBRIQUES.map((rubrique) => ({
    ...rubrique,
    documents: documents.filter((d) => d.category === rubrique.key),
  })).filter((r) => r.documents.length > 0);

  return (
    <Panel>
      <PanelHead
        eyebrow="Vos pièces"
        title="Coffre-fort"
        desc="Vos documents, classés et accessibles à tout moment. Ils ne quittent jamais nos serveurs sans votre action."
      />

      {remplies.length === 0 ? (
        <AnimateIn variant="fade-up" delay={80}>
          <EmptyPanel
            title="Votre coffre-fort est vide"
            desc="Votre conseiller y dépose vos relevés, contrats et comptes rendus au fil de l'accompagnement. Vous serez prévenu à chaque nouveau document."
          />
        </AnimateIn>
      ) : (
        <div className="space-y-9">
          {remplies.map((rubrique, i) => (
            <section key={rubrique.key}>
              <AnimateIn variant="fade-up" delay={80 + i * 60}>
                <h2 className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase mb-3">
                  {rubrique.label}
                </h2>
                <CardGrid min="240px">
                  {rubrique.documents.map((d) => (
                    <DocumentRow
                      key={d.id}
                      id={d.id}
                      name={d.name}
                      size={d.file_size}
                      date={formatDateLong(d.created_at)}
                    />
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
