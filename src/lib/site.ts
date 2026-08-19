/** Single source of truth for anything that needs the canonical site address. */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://horkos-wm.com"
).replace(/\/$/, "");

export const SITE_NAME = "Horkos Wealth Management";

export const SITE_DESCRIPTION =
  "Cabinet de conseil en gestion de patrimoine au Maroc. Structuration patrimoniale, stratégie d'investissement et transmission, pour particuliers, dirigeants et Marocains résidant à l'étranger.";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const CABINET_EMAIL = "bonjour@horkos-wm.com";

/**
 * TODO(client) : adresse complète du cabinet. Elle part telle quelle dans les
 * emails de confirmation des rendez-vous présentiels et dans l'invitation
 * calendrier — seul le quartier figure aujourd'hui dans la maquette.
 */
export const CABINET_ADDRESS = "Cabinet Horkos, Casablanca - Racine, Maroc";
