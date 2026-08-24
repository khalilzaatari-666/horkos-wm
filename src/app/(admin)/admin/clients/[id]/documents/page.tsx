import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminTable, Td } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { formatDateLong } from "@/lib/dates";
import { documentCategoryLabel } from "@/lib/documents";
import { DocumentCreate } from "./document-create";
import { DocumentOpenButton } from "./document-open-button";
import { deleteDocument } from "./actions";

export const metadata: Metadata = { title: "Documents" };

function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export default async function ClientDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("documents")
    .select("id, category, name, file_size, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const rows = data ?? [];

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px]">
          Les documents déposés ici apparaissent aussitôt dans le coffre-fort du client. Ils
          restent privés : chaque ouverture passe par un lien signé et est journalisée.
        </p>
        <DocumentCreate clientId={id} />
      </div>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Document", "Rubrique", "Taille", "Déposé le", ""]}
          isEmpty={rows.length === 0}
          empty="Aucun document. Déposez le premier — le client le retrouvera dans son coffre-fort."
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
