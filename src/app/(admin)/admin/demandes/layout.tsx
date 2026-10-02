import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/admin/ui";
import { DemandesTabs, type OngletDemandes } from "./tabs";

/**
 * Messages de contact, demandes de partenariat et dossiers de cession sous une
 * même section : trois versions de la même corvée, lire ce qu'on nous a écrit
 * et le traiter. Les dossiers de cession n'ont pas de « lu » : leur pastille
 * compte ceux encore au statut « Soumis », que personne n'a pris en main.
 *
 * Le layout compte les non-lus des deux tables pour les pastilles d'onglet. Il
 * est rendu à chaque page de la section, ce qui suffit à tenir les compteurs à
 * jour sans temps réel : marquer une demande lue revalide `/admin` en entier,
 * layouts compris.
 */
export default async function DemandesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [
    { count: contactsNonLus },
    { count: partenairesNonLus },
    { count: cessionsSoumises },
  ] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }).is("read_at", null),
    supabase
      .from("partner_submissions")
      .select("*", { count: "exact", head: true })
      .is("read_at", null),
    supabase
      .from("asset_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "soumis"),
  ]);

  const onglets: OngletDemandes[] = [
    { href: "/admin/demandes/contacts", label: "Contacts", nonLues: contactsNonLus ?? 0 },
    {
      href: "/admin/demandes/partenariats",
      label: "Partenariats",
      nonLues: partenairesNonLus ?? 0,
    },
    { href: "/admin/demandes/cessions", label: "Cessions", nonLues: cessionsSoumises ?? 0 },
  ];

  return (
    <AdminPanel>
      <DemandesTabs onglets={onglets} />
      {children}
    </AdminPanel>
  );
}
