/**
 * Où déposer quelqu'un après une connexion réussie.
 *
 * Un membre de l'équipe qui se connecte atterrissait dans l'espace client, sans
 * rien à l'écran menant au back-office. Le rôle décide donc de la destination -
 * sauf si une page précise était demandée avant la connexion, auquel cas c'est
 * elle qui gagne : on ne détourne pas quelqu'un de la page qu'il visait.
 */
export const DEFAULT_LANDING = "/espace";
export const STAFF_LANDING = "/admin";

export function landingFor(role: string | null | undefined): string {
  return role === "admin" || role === "conseiller" ? STAFF_LANDING : DEFAULT_LANDING;
}

/**
 * `requested` vient d'une chaîne de requête, donc d'une source non fiable :
 * seul un chemin relatif à simple barre est accepté. « //evil.com » est
 * protocole-relatif et transformerait la connexion en redirection ouverte.
 */
export function safeRedirect(requested: string | null): string | null {
  return requested && /^\/(?!\/)/.test(requested) ? requested : null;
}
