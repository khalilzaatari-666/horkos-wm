/**
 * Authentification à deux facteurs (TOTP) de l'équipe.
 *
 * Pourquoi : le mot de passe d'un compte staff se devine depuis l'API Supabase
 * Auth directement, avec la clé anon publique - notre plafond de 5 essais par
 * minute ne couvre que le formulaire du site. Un second facteur rend la
 * découverte du mot de passe insuffisante (circulaire AMMC 01/20, MFA
 * obligatoire pour admin et conseiller).
 *
 * Vocabulaire Supabase :
 *   - `currentLevel` : niveau de la session en cours. `aal1` = mot de passe
 *     seul, `aal2` = mot de passe + code TOTP vérifié.
 *   - `nextLevel` : niveau atteignable. `aal2` dès qu'un facteur est vérifié
 *     (« inscrit »), `aal1` sinon.
 *
 * Trois états en découlent pour un membre de l'équipe :
 *   - `a_inscrire` : aucun facteur vérifié - le back-office reste fermé tant
 *     que l'inscription n'est pas faite ;
 *   - `a_verifier` : facteur inscrit, session encore en aal1 - le code est
 *     demandé ;
 *   - `ok` : session en aal2.
 *
 * Ce module est importé par le proxy (edge) : rien de `server-only` ici.
 *
 * DÉSACTIVÉ PAR DÉFAUT. Décision du 18 septembre 2026 : l'équipe n'est pas
 * encore équipée d'une application d'authentification. Tout est en place ;
 * poser `STAFF_MFA_REQUIRED=true` (Vercel > Environment Variables) suffit à
 * l'imposer, après avoir activé TOTP dans Supabase > Authentication >
 * Multi-Factor. Sans ce prérequis, le back-office se fermerait à tous.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type EtatMfa = "a_inscrire" | "a_verifier" | "ok";

/** Page unique qui inscrit ou vérifie, selon l'état. */
export const MFA_PATH = "/connexion/equipe/mfa";

/** Le second facteur est-il exigé de l'équipe ? Voir l'en-tête. */
export function mfaExigee(): boolean {
  return process.env.STAFF_MFA_REQUIRED === "true";
}

/**
 * État MFA d'une session staff. Rend toujours `ok` tant que le second facteur
 * n'est pas exigé : les appelants n'ont pas à connaître l'interrupteur.
 */
export async function etatMfa(supabase: SupabaseClient): Promise<EtatMfa> {
  if (!mfaExigee()) return "ok";
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  // Sans réponse exploitable on exige la vérification plutôt que d'ouvrir : le
  // pire cas est un membre de l'équipe qui retape son code.
  if (error || !data) return "a_verifier";
  if (data.currentLevel === "aal2") return "ok";
  return data.nextLevel === "aal2" ? "a_verifier" : "a_inscrire";
}

/** URL de la page MFA, en gardant la destination visée. */
export function urlMfa(redirectTo: string): string {
  return `${MFA_PATH}?redirect=${encodeURIComponent(redirectTo)}`;
}
