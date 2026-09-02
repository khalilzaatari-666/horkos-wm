import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/admin/ui";
import { ClientTabs } from "@/components/admin/client-tabs";
import { peutAccederAuDossier } from "@/lib/client-access";
import { setClientAdvisor } from "./actions";

export default async function ClientDossierLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: client }, { data: me }, { data: conseillers }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, role, advisor_id")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("id, first_name, last_name").eq("role", "conseiller"),
  ]);

  if (!client) notFound();

  // Le filtre de la liste ne suffit pas : sans ce garde, un conseiller ouvrirait
  // le dossier d'un confrère en tapant son URL. `notFound` plutôt qu'un message :
  // l'existence même du dossier ne le regarde pas.
  if (!peutAccederAuDossier({ id: user.id, role: me?.role ?? "" }, client.advisor_id ?? null)) {
    notFound();
  }

  const nom = [client.first_name, client.last_name].filter(Boolean).join(" ") || "Client sans nom";
  const isAdmin = me?.role === "admin";
  const advisors = conseillers ?? [];
  const advisorName = client.advisor_id
    ? advisors
        .filter((c) => c.id === client.advisor_id)
        .map((c) => [c.first_name, c.last_name].filter(Boolean).join(" ") || "Conseiller")[0] ?? "-"
    : null;

  return (
    <AdminPanel>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <Link
            href="/admin/clients"
            className="text-[12px] text-warm-grey hover:text-bronze transition-colors"
          >
            ← Tous les clients
          </Link>
          <h1 className="font-heading text-[26px] font-semibold text-ink leading-[1.2] mt-1">
            {nom}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[12.5px]">
            {client.email && (
              <a href={`mailto:${client.email}`} className="text-bronze-dark hover:text-bronze transition-colors">
                {client.email}
              </a>
            )}
            {client.phone && (
              <a href={`tel:${client.phone}`} className="text-warm-grey hover:text-bronze transition-colors tabular-nums">
                {client.phone}
              </a>
            )}
          </div>
        </div>

        {/* Conseiller référent : modifiable par un admin, en lecture sinon. */}
        <div className="shrink-0">
          <div className="text-[11px] font-semibold tracking-[1.2px] uppercase text-warm-grey mb-1.5">
            Conseiller référent
          </div>
          {isAdmin ? (
            <form action={setClientAdvisor} className="flex items-center gap-2">
              <input type="hidden" name="clientId" value={client.id} />
              <select
                name="advisorId"
                defaultValue={client.advisor_id ?? ""}
                className="h-9 px-2.5 text-[12.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors cursor-pointer"
              >
                <option value="">Non assigné</option>
                {advisors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || "Conseiller"}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-9 px-3 text-[12px] font-medium text-bronze-dark border border-cream-deep rounded-lg hover:border-bronze hover:bg-cream transition-colors cursor-pointer"
              >
                Assigner
              </button>
            </form>
          ) : (
            <div className="text-[13px] text-charcoal">{advisorName ?? "Non assigné"}</div>
          )}
        </div>
      </div>

      <ClientTabs id={client.id} />

      {children}
    </AdminPanel>
  );
}
