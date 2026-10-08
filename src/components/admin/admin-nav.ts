/**
 * Sections du back-office, dans l'ordre de la maquette.
 *
 * `adminOnly` marque celles qui touchent aux rôles : un conseiller consulte les
 * rendez-vous et les dossiers, mais ne se promeut pas lui-même. La barre les
 * masque, et chaque page revérifie côté serveur - un menu caché n'est pas un
 * contrôle d'accès.
 */
import {
  LayoutGrid,
  CalendarDays,
  Users,
  MessageSquareText,
  Inbox,
  FileText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface AdminSection {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const adminSections: AdminSection[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutGrid },
  { href: "/admin/rendez-vous", label: "Rendez-vous", icon: CalendarDays },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/recommandations", label: "Recommandations", icon: MessageSquareText },
  { href: "/admin/demandes", label: "Demandes", icon: Inbox },
  { href: "/admin/contenu", label: "Contenu", icon: FileText },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: ShieldCheck, adminOnly: true },
];

/** `/admin` est le préfixe de toutes les autres : sans ça, il reste allumé partout. */
export function isAdminSectionActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
