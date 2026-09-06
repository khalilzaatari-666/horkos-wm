import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EspaceShell } from "@/components/client/espace-shell";
import { UmamiAnalytics } from "@/components/layout/umami-analytics";
import { profilComplet, CHEMIN_QUESTIONNAIRE } from "@/lib/intake";

/**
 * Le profil est chargé ici une seule fois : la barre latérale l'affiche, et
 * chaque page charge ensuite ses propres données.
 *
 * Le middleware garantit déjà qu'un utilisateur est connecté, mais il ne
 * garantit pas que sa ligne `profiles` existe - le déclencheur
 * `handle_new_user` peut avoir échoué. On préfère renvoyer vers la connexion
 * plutôt que d'afficher un espace à moitié vide sans expliquer pourquoi.
 *
 * C'est aussi ici que se joue la porte du questionnaire, et pas dans le proxy :
 * ce layout lit déjà le profil à chaque page de l'espace, donc la règle ne coûte
 * rien de plus. Elle couvre du même coup toute route ajoutée plus tard sous
 * `/espace`, ce qu'un contrôle page par page finirait par oublier.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/espace");

  // Le questionnaire voyage avec le profil : une seule requête, la relation
  // étant portée par `client_intake.client_id`.
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, phone, role, intake:client_intake(client_id)")
    .eq("id", user.id)
    .maybeSingle();

  // PostgREST rend une relation en objet ou en tableau selon la cardinalité
  // qu'il infère : on accepte les deux plutôt que de parier.
  const intake = profile?.intake;
  const intakeRempli = Array.isArray(intake) ? intake.length > 0 : Boolean(intake);

  if (
    !profilComplet({
      role: profile?.role,
      first_name: profile?.first_name,
      last_name: profile?.last_name,
      phone: profile?.phone,
      intakeRempli,
    })
  ) {
    redirect(CHEMIN_QUESTIONNAIRE);
  }

  return (
    <>
      <UmamiAnalytics />
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
    </>
  );
}
