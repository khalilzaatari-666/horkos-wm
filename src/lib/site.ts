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
