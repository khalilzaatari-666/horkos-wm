import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "conseiller")) {
    redirect("/espace");
  }

  return (
    <AdminShell
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
