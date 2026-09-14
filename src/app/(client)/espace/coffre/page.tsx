import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, PanelHead, CardGrid, EmptyPanel } from "@/components/client/ui";
import { DocumentRow } from "@/components/client/document-row";
import { formatDateLong } from "@/lib/dates";
import { DOCUMENT_RUBRIQUES as RUBRIQUES } from "@/lib/documents";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { param, pick, recherche, trier, instant, contient } from "@/lib/liste";

export const metadata: Metadata = { title: "Coffre-fort" };

/**
 * Les rubriques restent des sections, comme toujours : ce que le tri règle,
 * c'est l'ordre des pièces à l'intérieur de chacune. Un client cherche « le
 * relevé de mars », pas « le douzième document déposé ».
 */
const ORDRES = [
  { value: "ancien", label: "Du plus ancien" },
  { value: "nom", label: "Par nom" },
];
const CLES = RUBRIQUES.map((r) => r.key);

export default async function CoffrePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const ordre = pick(param(raw, "ordre"), ["ancien", "nom"] as const, null);
  const rubrique = pick(param(raw, "rubrique"), CLES, null);
  const q = recherche(raw);

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
  const retenus = documents.filter(
    (d) => (rubrique === null || d.category === rubrique) && contient([d.name], q)
  );

  const remplies = RUBRIQUES.map((r) => ({
    ...r,
    documents: trier(
      retenus.filter((d) => d.category === r.key),
      (d) => (ordre === "nom" ? d.name : instant(d.created_at)),
      ordre === null ? "desc" : "asc",
      (d) => d.name
    ),
  })).filter((r) => r.documents.length > 0);

  return (
    <Panel>
      <PanelHead
        eyebrow="Vos pièces"
        title="Coffre-fort"
        desc="Vos documents, classés et accessibles à tout moment. Ils ne quittent jamais nos serveurs sans votre action."
      />

      {documents.length > 0 && (
        <AnimateIn variant="fade-up" delay={60}>
          <FiltresListe
            champs={[
              {
                cle: "rubrique",
                aria: "Rubrique",
                toutes: "Toutes les rubriques",
                options: RUBRIQUES.map((r) => ({ value: r.key, label: r.label })),
              },
              { cle: "ordre", aria: "Ordre", toutes: "Du plus récent", options: ORDRES },
            ]}
            recherche={{ placeholder: "Rechercher un document…" }}
            total={retenus.length}
            unite="document"
          />
        </AnimateIn>
      )}

      {remplies.length === 0 ? (
        <AnimateIn variant="fade-up" delay={80}>
          <EmptyPanel
            title={
              documents.length > 0 ? "Aucun document ne correspond" : "Votre coffre-fort est vide"
            }
            desc={
              documents.length > 0
                ? "Élargissez la rubrique ou effacez la recherche pour retrouver vos pièces."
                : "Votre conseiller y dépose vos relevés, contrats et comptes rendus au fil de l'accompagnement. Vous serez prévenu à chaque nouveau document."
            }
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
