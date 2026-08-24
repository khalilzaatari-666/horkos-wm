import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminTable, Td } from "@/components/admin/ui";
import { formatDateLong } from "@/lib/dates";
import { formatMAD } from "@/lib/patrimoine";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  // On neutralise les caractères qui ont un sens dans un filtre PostgREST
  // (`,`, `()`, `%`, `*`, `:`) avant de l'interpoler dans le `.or(...)`.
  const q = ((Array.isArray(raw.q) ? raw.q[0] : raw.q) ?? "")
    .replace(/[,()%*:]/g, " ")
    .trim()
    .slice(0, 80);

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, advisor_id, created_at")
    .eq("role", "client")
    .order("created_at", { ascending: false })
    .limit(500);

  if (q) {
    // Recherche simple sur le nom ou l'email.
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`
    );
  }

  const [{ data: clients }, { data: conseillers }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, first_name, last_name").eq("role", "conseiller"),
  ]);

  const rows = clients ?? [];

  // Total du patrimoine par client, agrégé en mémoire à partir d'une requête.
  const ids = rows.map((r) => r.id);
  const totals = new Map<string, number>();
  if (ids.length) {
    const { data: assets } = await supabase
      .from("assets")
      .select("client_id, value")
      .in("client_id", ids);
    for (const a of assets ?? []) {
      totals.set(a.client_id, (totals.get(a.client_id) ?? 0) + (Number(a.value) || 0));
    }
  }

  const advisorName = new Map(
    (conseillers ?? []).map((c) => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" ") || "Conseiller",
    ])
  );

  return (
    <AdminPanel>
      <AdminHead
        title="Clients"
        desc="Les comptes clients et leur dossier : patrimoine, audits, documents et recommandations."
      />

      <AnimateIn variant="fade-up" delay={40}>
        <form method="get" className="mb-4">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher par nom ou email…"
            className="w-full sm:max-w-xs h-10 px-3.5 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors"
          />
        </form>
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Nom", "Contact", "Patrimoine", "Conseiller référent", "Inscrit le"]}
          isEmpty={rows.length === 0}
          empty={q ? "Aucun client ne correspond à cette recherche." : "Aucun client inscrit."}
        >
          {rows.map((c) => {
            const nom = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Sans nom";
            return (
              <tr key={c.id} className="hover:bg-cream/40 transition-colors align-top">
                <Td>
                  <Link
                    href={`/admin/clients/${c.id}`}
                    className="font-medium text-ink hover:text-bronze-dark transition-colors"
                  >
                    {nom}
                  </Link>
                </Td>
                <Td>
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="block text-[12.5px] text-bronze-dark hover:text-bronze transition-colors truncate max-w-[220px]"
                    >
                      {c.email}
                    </a>
                  )}
                  {c.phone && <div className="text-[12px] text-warm-grey">{c.phone}</div>}
                </Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {totals.get(c.id) ? formatMAD(totals.get(c.id)!) : "-"}
                </Td>
                <Td className="whitespace-nowrap text-charcoal">
                  {c.advisor_id ? (advisorName.get(c.advisor_id) ?? "-") : <span className="text-warm-grey">-</span>}
                </Td>
                <Td className="whitespace-nowrap text-warm-grey">{formatDateLong(c.created_at)}</Td>
              </tr>
            );
          })}
        </AdminTable>
      </AnimateIn>
    </AdminPanel>
  );
}
