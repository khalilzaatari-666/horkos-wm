import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { formatDateLong } from "@/lib/dates";
import { formatMAD } from "@/lib/patrimoine";

export const metadata: Metadata = { title: "Soumissions d'actifs" };

const STATUS: Record<string, { label: string; tone: "neutre" | "attente" | "succes" | "refus" }> = {
  soumis: { label: "Soumis", tone: "attente" },
  en_revue: { label: "En revue", tone: "attente" },
  accepte: { label: "Accepté", tone: "succes" },
  rejete: { label: "Non retenu", tone: "refus" },
};

export default async function SoumissionsPage() {
  const supabase = await createClient();

  const { data: soumissions } = await supabase
    .from("asset_submissions")
    .select(
      "id, asset_type, description, estimated_value, reason, horizon, status, created_at, client_id, contact_name, contact_email, contact_phone"
    )
    .order("created_at", { ascending: false });

  const rows = soumissions ?? [];

  return (
    <AdminPanel>
      <AdminHead
        title="Soumissions d'actifs"
        desc="Les dossiers de cession déposés depuis le site public ou l'espace client. Un dossier rattaché à un compte porte la mention « Client »."
      />

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Actif", "Valeur estimée", "Motif", "Horizon", "Déposant", "Reçu le", "Statut"]}
          isEmpty={rows.length === 0}
          empty="Aucune soumission pour l'instant. Elles apparaîtront ici dès qu'un visiteur ou un client déposera un dossier de cession."
        >
          {rows.map((s) => {
            const status = STATUS[s.status] ?? { label: s.status, tone: "neutre" as const };
            return (
              <tr key={s.id} className="hover:bg-cream/40 transition-colors">
                <Td className="max-w-[280px]">
                  <div className="font-medium text-ink">{s.asset_type}</div>
                  {s.description && (
                    <p className="text-[12px] text-warm-grey leading-[1.5] mt-1">{s.description}</p>
                  )}
                </Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {s.estimated_value ? formatMAD(Number(s.estimated_value)) : "—"}
                </Td>
                <Td>{s.reason ?? "—"}</Td>
                <Td>{s.horizon ?? "—"}</Td>
                <Td>
                  <div className="font-medium text-ink">{s.contact_name ?? "—"}</div>
                  {s.contact_email && (
                    <a
                      href={`mailto:${s.contact_email}`}
                      className="block text-[12px] text-bronze-dark hover:text-bronze transition-colors"
                    >
                      {s.contact_email}
                    </a>
                  )}
                  {s.contact_phone && (
                    <div className="text-[12px] text-warm-grey">{s.contact_phone}</div>
                  )}
                  <div className="mt-1.5">
                    <AdminBadge tone={s.client_id ? "info" : "neutre"}>
                      {s.client_id ? "Client" : "Visiteur"}
                    </AdminBadge>
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{formatDateLong(s.created_at)}</Td>
                <Td>
                  <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                </Td>
              </tr>
            );
          })}
        </AdminTable>
      </AnimateIn>
    </AdminPanel>
  );
}
