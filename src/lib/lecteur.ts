import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Les guides et les articles se lisent en entier une fois le lecteur
 * identifié (prénom, nom, email, téléphone vérifié par SMS). Ce cookie porte
 * l'identifiant de sa fiche `content_leads` : il ne vaut que si la fiche est
 * vérifiée, et ouvre tous les contenus pendant un an.
 */
export const LECTEUR_COOKIE = "horkos_lecteur";
export const LECTEUR_MAX_AGE = 60 * 60 * 24 * 365;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un client ou un membre de l'équipe connecté lit tout, sans formulaire. */
export async function estDeverrouille(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return true;

  const id = (await cookies()).get(LECTEUR_COOKIE)?.value;
  if (!id || !UUID.test(id)) return false;

  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin
    .from("content_leads")
    .select("id")
    .eq("id", id)
    .not("verified_at", "is", null)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Les deux colonnes réservées (texte d'un article, PDF d'un guide) ne sont
 * pas lisibles avec la clé publique (migration 033) : on les lit ici avec la
 * clé de service, uniquement pour un contenu publié.
 */
export async function lireContenuArticle(id: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("articles")
    .select("content")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  return data?.content ?? null;
}

export async function lirePdfGuide(id: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("guides")
    .select("pdf_url")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  return data?.pdf_url ?? null;
}

/** Les paragraphes d'un article, tels que saisis au back-office. */
export function paragraphes(content: string | null): string[] {
  return (content ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
