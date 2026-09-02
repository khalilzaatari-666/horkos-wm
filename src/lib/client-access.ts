/**
 * Qui accède au dossier d'un client ?
 *
 * C'est LE point à changer si la règle évolue : la liste des clients en tire son
 * filtre, le dossier son droit d'entrée, les actions du suivi leur droit
 * d'écriture. Aucune décision d'accès n'est prise ailleurs.
 *
 * Règle en vigueur :
 *   - l'admin voit tous les dossiers, sans exception ;
 *   - le conseiller voit les clients dont il est le référent, plus ceux qui
 *     n'ont pas encore de référent - sinon un client non assigné ne serait
 *     joignable par personne.
 *
 * Attention : la RLS, elle, laisse toute l'équipe lire `profiles`. Cette règle
 * est donc appliquée par le code, à chaque entrée. Une nouvelle page sur le
 * dossier client doit l'appeler comme les autres.
 *
 * Pour ouvrir tous les dossiers à n'importe quel conseiller, il suffit que la
 * fonction rende `true` dès que le rôle est « conseiller ».
 */
export interface StaffIdentity {
  id: string;
  role: string;
}

export function peutAccederAuDossier(
  staff: StaffIdentity,
  clientAdvisorId: string | null
): boolean {
  if (staff.role === "admin") return true;
  if (staff.role !== "conseiller") return false;
  return clientAdvisorId === null || clientAdvisorId === staff.id;
}
