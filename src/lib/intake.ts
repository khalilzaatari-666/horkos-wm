/**
 * La porte d'entrée de l'espace client.
 *
 * Un compte peut naître sans rien : `/inscription` place les boutons Google et
 * Microsoft au-dessus des champs prénom / nom, et qui clique un fournisseur
 * quitte la page avant de les avoir touchés. Le questionnaire, lui, n'était
 * recueilli que dans le parcours de réservation. Résultat : des comptes sans
 * nom, sans téléphone et sans contexte.
 *
 * Comme Supabase crée le compte à l'instant où le fournisseur redirige - il n'y
 * a aucun point d'arrêt à l'inscription - la garantie se prend après connexion.
 * Cette fonction est la règle, appelée par le layout de l'espace client ; elle
 * vit à part pour être testée sans monter de page.
 */

export const CHEMIN_QUESTIONNAIRE = "/completer-mon-profil";

export interface ProfilMinimal {
  role: string | null | undefined;
  first_name: string | null | undefined;
  last_name: string | null | undefined;
  phone: string | null | undefined;
  /** Le questionnaire a-t-il été rempli ? */
  intakeRempli: boolean;
}

function renseigne(valeur: string | null | undefined): boolean {
  return typeof valeur === "string" && valeur.trim().length > 0;
}

/**
 * L'espace client est-il ouvert à ce profil ?
 *
 * L'équipe passe toujours : un conseiller qui jette un œil à l'espace client
 * n'a pas de questionnaire patrimonial à remplir, et l'enfermer dehors le
 * priverait du lien vers son propre back-office.
 */
export function profilComplet(profil: ProfilMinimal): boolean {
  if (profil.role === "admin" || profil.role === "conseiller") return true;
  return (
    renseigne(profil.first_name) &&
    renseigne(profil.last_name) &&
    renseigne(profil.phone) &&
    profil.intakeRempli
  );
}
