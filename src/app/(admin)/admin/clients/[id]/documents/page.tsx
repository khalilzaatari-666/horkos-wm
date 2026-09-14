import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminTable, Td } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { formatDateLong } from "@/lib/dates";
import { documentCategoryLabel, DOCUMENT_RUBRIQUES } from "@/lib/documents";
import { param, pick, sensDe, recherche, trier, instant, contient } from "@/lib/liste";
import { DocumentCreate } from "./document-create";
import { DocumentOpenButton } from "./document-open-button";
import { deleteDocument } from "./actions";

export const metadata: Metadata = { title: "Documents" };

function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

const TRIS = ["document", "rubrique", "taille", "depose"] as const;
const RUBRIQUES = DOCUMENT_RUBRIQUES.map((r) => r.key);

export default async function ClientDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "depose")!;
  const sens = sensDe(param(raw, "sens"), tri === "depose" ? "desc" : "asc");
  const rubrique = pick(param(raw, "rubrique"), RUBRIQUES, null);
  const q = recherche(raw);

  const supabase = await createClient();

  const { data } = await supabase
    .from("documents")
    .select("id, category, name, file_size, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const toutes = data ?? [];
  const rows = trier(
    toutes.filter(
      (d) =>
        (rubrique === null || d.category === rubrique) &&
        contient([d.name, documentCategoryLabel(d.category)], q)
    ),
    (d) =>
      tri === "document"
        ? d.name
        : tri === "rubrique"
          ? documentCategoryLabel(d.category)
          : tri === "taille"
            ? (d.file_size ?? null)
            : instant(d.created_at),
    sens,
    (d) => d.name
  );

  const qs = { rubrique: rubrique ?? undefined, q: q || undefined };

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px]">
          Les documents déposés ici apparaissent aussitôt dans le coffre-fort du client. Ils
          restent privés : chaque ouverture passe par un lien signé et est journalisée.
        </p>
        <DocumentCreate clientId={id} />
      </div>

      {toutes.length > 0 && (
        <AnimateIn variant="fade-up" delay={40}>
          <FiltresListe
            champs={[
              {
                cle: "rubrique",
                aria: "Rubrique",
                toutes: "Toutes les rubriques",
                options: DOCUMENT_RUBRIQUES.map((r) => ({ value: r.key, label: r.label })),
              },
            ]}
            recherche={{ placeholder: "Rechercher un document…" }}
            total={rows.length}
            unite="document"
          />
        </AnimateIn>
      )}

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            <TriHeader
              key="doc"
              label="Document"
              colonne="document"
              tri={tri}
              sens={sens}
              params={qs}
            />,
            <TriHeader
              key="rub"
              label="Rubrique"
              colonne="rubrique"
              tri={tri}
              sens={sens}
              params={qs}
            />,
            <TriHeader
              key="tai"
              label="Taille"
              colonne="taille"
              tri={tri}
              sens={sens}
              params={qs}
              sensInitial="desc"
            />,
            <TriHeader
              key="dep"
              label="Déposé le"
              colonne="depose"
              tri={tri}
              sens={sens}
              params={qs}
              sensInitial="desc"
            />,
            "",
          ]}
          isEmpty={rows.length === 0}
          empty={
            q || rubrique
              ? "Aucun document ne correspond à ces critères."
              : "Aucun document. Déposez le premier — le client le retrouvera dans son coffre-fort."
          }
        >
          {rows.map((d) => (
            <tr key={d.id} className="hover:bg-cream/40 transition-colors align-top">
              <Td className="text-ink font-medium">{d.name}</Td>
              <Td className="whitespace-nowrap text-charcoal">{documentCategoryLabel(d.category)}</Td>
              <Td className="whitespace-nowrap text-warm-grey tabular-nums">
                {formatSize(d.file_size)}
              </Td>
              <Td className="whitespace-nowrap text-warm-grey">{formatDateLong(d.created_at)}</Td>
              <Td>
                <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                  <DocumentOpenButton id={d.id} />
                  <form action={deleteDocument}>
                    <input type="hidden" name="documentId" value={d.id} />
                    <input type="hidden" name="clientId" value={id} />
                    <ConfirmButton
                      message={`Supprimer définitivement « ${d.name} » ?`}
                      className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Supprimer
                    </ConfirmButton>
                  </form>
                </div>
              </Td>
            </tr>
          ))}
        </AdminTable>
      </AnimateIn>
    </>
  );
}
