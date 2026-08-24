import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { formatDateLong } from "@/lib/dates";
import { AuditCreate } from "./audit-create";
import { AuditOpenButton } from "./audit-open-button";
import { AuditRowActions } from "./audit-row-actions";

export const metadata: Metadata = { title: "Audits" };

export default async function ClientAuditsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("audits")
    .select("id, status, pdf_url, created_at, updated_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const rows = data ?? [];

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
        <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px]">
          L&apos;audit patrimonial et son rapport. Le statut et le rapport sont visibles par le
          client sur sa page patrimoine ; le PDF reste privé (lien signé).
        </p>
        <AuditCreate clientId={id} />
      </div>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Statut", "Rapport", "Ouvert le", "Mis à jour", ""]}
          isEmpty={rows.length === 0}
          empty="Aucun audit. Ouvrez-en un — le client verra son statut sur sa page patrimoine."
        >
          {rows.map((a) => {
            const hasReport = Boolean(a.pdf_url);
            return (
              <tr key={a.id} className="hover:bg-cream/40 transition-colors align-top">
                <Td>
                  <AdminBadge tone={a.status === "termine" ? "succes" : "attente"}>
                    {a.status === "termine" ? "Terminé" : "En cours"}
                  </AdminBadge>
                </Td>
                <Td className="whitespace-nowrap">
                  {hasReport ? (
                    <AuditOpenButton auditId={a.id} />
                  ) : (
                    <span className="text-warm-grey">-</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-warm-grey">{formatDateLong(a.created_at)}</Td>
                <Td className="whitespace-nowrap text-warm-grey">{formatDateLong(a.updated_at)}</Td>
                <Td>
                  <AuditRowActions clientId={id} audit={{ id: a.id, status: a.status, hasReport }} />
                </Td>
              </tr>
            );
          })}
        </AdminTable>
      </AnimateIn>
    </>
  );
}
