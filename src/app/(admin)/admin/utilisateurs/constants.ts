/**
 * Constantes partagées entre les actions serveur et les composants clients.
 *
 * Hors de `actions.ts` volontairement : un module `"use server"` ne peut
 * exporter que des fonctions asynchrones. Un tableau exporté depuis là-bas
 * arrive côté client sous forme de référence serveur — d'où un
 * `.map is not a function` que ni TypeScript ni le build ne voient passer.
 */

export const ROLES = ["client", "conseiller", "admin"] as const;

/** Rôles qu'une invitation peut attribuer. On n'invite pas un client. */
export const INVITABLE_ROLES = ["conseiller", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  client: "Client",
  conseiller: "Conseiller",
  admin: "Administrateur",
};
