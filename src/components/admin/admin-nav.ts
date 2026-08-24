/**
 * Sections du back-office, dans l'ordre de la maquette.
 *
 * `adminOnly` marque celles qui touchent aux rôles : un conseiller consulte les
 * rendez-vous et les dossiers, mais ne se promeut pas lui-même. La barre les
 * masque, et chaque page revérifie côté serveur - un menu caché n'est pas un
 * contrôle d'accès.
 */
export interface AdminSection {
  href: string;
  label: string;
  adminOnly?: boolean;
}

export const adminSections: AdminSection[] = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/rendez-vous", label: "Rendez-vous" },
  { href: "/admin/soumissions", label: "Soumissions d'actifs" },
  { href: "/admin/contenu/articles", label: "Articles" },
  { href: "/admin/contenu/guides", label: "Guides" },
  { href: "/admin/contenu/evenements", label: "Événements" },
  { href: "/admin/utilisateurs", label: "Utilisateurs", adminOnly: true },
];

/** `/admin` est le préfixe de toutes les autres : sans ça, il reste allumé partout. */
export function isAdminSectionActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
