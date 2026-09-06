import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/admin/ui";
import { DemandesTabs, type OngletDemandes } from "./tabs";

/**
 * Messages de contact et demandes de partenariat sous une même section : ce sont
 * deux versions de la même corvée, lire ce qu'on nous a écrit et le traiter.
 *
 * Le layout compte les non-lus des deux tables pour les pastilles d'onglet. Il
 * est rendu à chaque page de la section, ce qui suffit à tenir les compteurs à
 * jour sans temps réel : marquer une demande lue revalide `/admin` en entier,
 * layouts compris.
 */
export default async function DemandesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [{ count: contactsNonLus }, { count: partenairesNonLus }] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }).is("read_at", null),
    supabase
      .from("partner_submissions")
      .select("*", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  const onglets: OngletDemandes[] = [
    { href: "/admin/demandes/contacts", label: "Contacts", nonLues: contactsNonLus ?? 0 },
    {
      href: "/admin/demandes/partenariats",
      label: "Partenariats",
      nonLues: partenairesNonLus ?? 0,
    },
  ];

  return (
    <AdminPanel>
      <DemandesTabs onglets={onglets} />
      {children}
    </AdminPanel>
  );
}
