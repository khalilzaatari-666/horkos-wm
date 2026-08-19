import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EspaceShell } from "@/components/client/espace-shell";

/**
 * Le profil est chargé ici une seule fois : la barre latérale l'affiche, et
 * chaque page charge ensuite ses propres données.
 *
 * Le middleware garantit déjà qu'un utilisateur est connecté, mais il ne
 * garantit pas que sa ligne `profiles` existe — le déclencheur
 * `handle_new_user` peut avoir échoué. On préfère renvoyer vers la connexion
 * plutôt que d'afficher un espace à moitié vide sans expliquer pourquoi.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/espace");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <EspaceShell
      profile={{
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        email: profile?.email ?? user.email ?? null,
        role: profile?.role ?? "client",
      }}
    >
      {children}
    </EspaceShell>
  );
}
