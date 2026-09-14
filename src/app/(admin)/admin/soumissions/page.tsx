import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { formatDateLong } from "@/lib/dates";
import { formatMAD } from "@/lib/patrimoine";
import { param, pick, sensDe, recherche, trier, instant, contient, LIMITE_LISTE } from "@/lib/liste";

export const metadata: Metadata = { title: "Cession d'actifs" };

const STATUS: Record<string, { label: string; tone: "neutre" | "attente" | "succes" | "refus" }> = {
  soumis: { label: "Soumis", tone: "attente" },
  en_revue: { label: "En revue", tone: "attente" },
  accepte: { label: "Accepté", tone: "succes" },
  rejete: { label: "Non retenu", tone: "refus" },
};

const TRIS = ["actif", "valeur", "deposant", "recu", "statut"] as const;
const STATUTS = ["soumis", "en_revue", "accepte", "rejete"] as const;
/** Un dossier de visiteur n'a pas de dossier client à ouvrir : la distinction
 *  change la façon de le traiter, elle mérite son filtre. */
const ORIGINES = [
  { value: "client", label: "Déposés par un client" },
  { value: "visiteur", label: "Déposés par un visiteur" },
];

export default async function SoumissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "recu")!;
  const sens = sensDe(param(raw, "sens"), tri === "recu" ? "desc" : "asc");
  const statut = pick(param(raw, "statut"), STATUTS, null);
  const origine = pick(param(raw, "origine"), ["client", "visiteur"] as const, null);
  const q = recherche(raw);

  const supabase = await createClient();

  const { data: soumissions } = await supabase
    .from("asset_submissions")
    .select(
      "id, asset_type, description, estimated_value, reason, horizon, status, created_at, client_id, contact_name, contact_email, contact_phone"
    )
    .order("created_at", { ascending: false })
    .limit(LIMITE_LISTE);

  const rows = trier(
    (soumissions ?? []).filter(
      (d) =>
        (statut === null || d.status === statut) &&
        (origine === null || (origine === "client") === Boolean(d.client_id)) &&
        contient([d.asset_type, d.description, d.contact_name, d.contact_email, d.reason], q)
    ),
    (d) =>
      tri === "actif"
        ? d.asset_type
        : tri === "valeur"
          ? Number(d.estimated_value) || null
          : tri === "deposant"
            ? d.contact_name
            : tri === "statut"
              ? d.status
              : instant(d.created_at),
    sens,
    (d) => d.asset_type
  );

  const qs = {
    statut: statut ?? undefined,
    origine: origine ?? undefined,
    q: q || undefined,
  };

  return (
    <AdminPanel>
      <AdminHead
        title="Cession d'actifs"
        desc="Les dossiers de cession déposés depuis le site public ou l'espace client. Un dossier rattaché à un compte porte la mention « Client »."
      />

      <AnimateIn variant="fade-up" delay={40}>
        <FiltresListe
          champs={[
            {
              cle: "statut",
              aria: "Statut",
              toutes: "Tous les statuts",
              options: STATUTS.map((v) => ({ value: v, label: STATUS[v].label })),
            },
            { cle: "origine", aria: "Déposant", toutes: "Tous les déposants", options: ORIGINES },
          ]}
          recherche={{ placeholder: "Rechercher un actif, un déposant…" }}
          total={rows.length}
          unite="dossier"
        />
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            <TriHeader key="a" label="Actif" colonne="actif" tri={tri} sens={sens} params={qs} />,
            <TriHeader
              key="v"
              label="Valeur estimée"
              colonne="valeur"
              tri={tri}
              sens={sens}
              params={qs}
              sensInitial="desc"
            />,
            "Motif",
            "Horizon",
            <TriHeader
              key="d"
              label="Déposant"
              colonne="deposant"
              tri={tri}
              sens={sens}
              params={qs}
            />,
            <TriHeader
              key="r"
              label="Reçu le"
              colonne="recu"
              tri={tri}
              sens={sens}
              params={qs}
              sensInitial="desc"
            />,
            <TriHeader key="s" label="Statut" colonne="statut" tri={tri} sens={sens} params={qs} />,
          ]}
          isEmpty={rows.length === 0}
          empty={
            q || statut || origine
              ? "Aucun dossier ne correspond à ces critères."
              : "Aucun dossier pour l'instant. Ils apparaîtront ici dès qu'un visiteur ou un client déposera un dossier de cession."
          }
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
                  {s.estimated_value ? formatMAD(Number(s.estimated_value)) : "-"}
                </Td>
                <Td>{s.reason ?? "-"}</Td>
                <Td>{s.horizon ?? "-"}</Td>
                <Td>
                  <div className="font-medium text-ink">{s.contact_name ?? "-"}</div>
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
