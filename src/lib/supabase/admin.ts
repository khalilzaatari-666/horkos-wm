import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase à clé de service — contourne INTÉGRALEMENT la sécurité au
 * niveau des lignes.
 *
 * Réservé à la seule opération qui l'exige : créer un compte pour un membre de
 * l'équipe, ce qu'aucune clé publique ne permet. Toute autre lecture ou
 * écriture doit passer par `@/lib/supabase/server`, où les policies s'appliquent.
 *
 * Règles de sécurité, non négociables :
 *   - `server-only` : l'import casse la compilation si ce module atteint un
 *     composant client, donc la clé ne peut pas fuir dans le navigateur ;
 *   - `persistSession: false` : aucune session écrite, ce client est apatride ;
 *   - l'appelant DOIT avoir vérifié le rôle admin avant d'appeler ceci. La clé
 *     n'obéit à aucune policy, elle ne rattrapera pas un contrôle oublié.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function adminClientConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
