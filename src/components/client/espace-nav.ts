/**
 * Les cinq sections de l'espace client, dans l'ordre de la maquette.
 *
 * Partagé entre la barre latérale et le tiroir mobile pour que les deux ne
 * puissent pas diverger.
 */
export interface EspaceSection {
  href: string;
  label: string;
}

export const espaceSections: EspaceSection[] = [
  { href: "/espace", label: "Tableau de bord" },
  { href: "/espace/accompagnement", label: "Mon accompagnement" },
  { href: "/espace/patrimoine", label: "Mon patrimoine" },
  { href: "/espace/ceder", label: "Céder un actif" },
  { href: "/espace/coffre", label: "Coffre-fort" },
];

/**
 * `/espace` est le préfixe de toutes les autres : sans traitement particulier
 * le tableau de bord resterait allumé sur chaque page.
 */
export function isSectionActive(href: string, pathname: string): boolean {
  if (href === "/espace") return pathname === "/espace";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** « Othmane Benzakour » → « OB ». Retombe sur l'email si le nom manque. */
export function initials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const letters = [firstName?.trim()?.[0], lastName?.trim()?.[0]].filter(Boolean).join("");
  if (letters) return letters.toUpperCase();
  return (email?.trim()?.[0] ?? "?").toUpperCase();
}

/** « Othmane B. » — assez pour se reconnaître, sans encombrer la barre. */
export function shortName(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first && last) return `${first} ${last[0].toUpperCase()}.`;
  if (first) return first;
  if (last) return last;
  return email?.split("@")[0] ?? "Mon espace";
}
