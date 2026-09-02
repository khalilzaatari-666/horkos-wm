import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { TEAM_EMAIL } from "@/lib/site";

/**
 * Adresses de l'équipe (admins + conseillers) qui doivent recevoir les alertes
 * internes - nouvelles soumissions, messages de contact.
 *
 * Lecture via la clé de service, CÔTÉ SERVEUR UNIQUEMENT : un visiteur anonyme
 * n'a aucun accès aux profils du staff (RLS), et ces adresses ne doivent jamais
 * atteindre le navigateur - elles ne servent qu'à remplir le champ `to` d'un
 * email envoyé depuis le serveur. Une fonction SECURITY DEFINER ouverte à `anon`
 * les exposerait au contraire à n'importe quel appelant : la clé de service,
 * confinée au serveur, est ici le choix le plus protecteur.
 *
 * Repli sur TEAM_EMAIL si la clé manque ou si aucun membre n'a d'adresse, pour
 * qu'une alerte ne parte jamais dans le vide.
 */
/**
 * Le conseiller référent d'un client : son nom et son adresse.
 *
 * Même raison que ci-dessus pour la clé de service - un client ne lit pas les
 * profils de l'équipe. Rend `null` si le client n'a pas de référent, si la clé
 * manque, ou si le référent n'a pas d'adresse : l'appelant retombe alors sur
 * l'équipe entière.
 */
export async function advisorRecipient(
  advisorId: string | null
): Promise<{ name: string; email: string } | null> {
  if (!advisorId) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", advisorId)
    .maybeSingle();

  const email = (data?.email as string | null)?.trim();
  if (error || !email) return null;

  return {
    name: [data?.first_name, data?.last_name].filter(Boolean).join(" ") || "Conseiller",
    email,
  };
}

export async function staffRecipients(): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [TEAM_EMAIL];

  const { data, error } = await admin
    .from("profiles")
    .select("email")
    .in("role", ["admin", "conseiller"])
    .not("email", "is", null);

  if (error || !data) {
    console.error("[email] lecture des destinataires staff échouée:", error?.message);
    return [TEAM_EMAIL];
  }

  const emails = Array.from(
    new Set(
      data
        .map((r) => (r.email as string | null)?.trim())
        .filter((e): e is string => Boolean(e))
    )
  );

  return emails.length > 0 ? emails : [TEAM_EMAIL];
}
