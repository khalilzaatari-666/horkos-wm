import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { etatMfa, urlMfa } from "@/lib/mfa";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * Le proxy filtre déjà `/admin/*` sur le rôle, mais on revérifie ici : c'est ce
 * layout qui décide ce que la barre latérale montre, et il vaut mieux une seule
 * source de vérité pour le rôle plutôt que deux lectures qui pourraient
 * diverger.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion/equipe?redirect=/admin");

  // Les non-lus des deux tables de demandes voyagent avec le profil : c'est la
  // barre latérale qui les affiche, et elle est rendue sur chaque page du
  // back-office. Deux `count … head: true` sur un index partiel - voir la
  // migration 020 - plutôt qu'une lecture des lignes.
  const [{ data: profile }, { count: contactsNonLus }, { count: partenairesNonLus }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("contacts").select("*", { count: "exact", head: true }).is("read_at", null),
      supabase
        .from("partner_submissions")
        .select("*", { count: "exact", head: true })
        .is("read_at", null),
    ]);

  if (!profile || (profile.role !== "admin" && profile.role !== "conseiller")) {
    redirect("/espace");
  }

  // Même règle que le proxy : pas de back-office sans second facteur.
  if ((await etatMfa(supabase)) !== "ok") redirect(urlMfa("/admin"));

  return (
    <AdminShell
      badges={{ "/admin/demandes": (contactsNonLus ?? 0) + (partenairesNonLus ?? 0) }}
      profile={{
        id: user.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email ?? user.email ?? null,
        role: profile.role,
        avatar_url: profile.avatar_url ?? null,
      }}
    >
      {children}
    </AdminShell>
  );
}
