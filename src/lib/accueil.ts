/**
 * Où mène l'accueil ?
 *
 * Trois publics arrivent sur `/` : le visiteur, qui doit voir le site ; le
 * client, dont la place est dans son espace ; le conseiller, dans le
 * back-office. Mais la barre latérale des deux espaces porte un lien « Retour
 * au site » qui pointe précisément sur `/` : un détournement systématique le
 * rendrait inutilisable, et enfermerait dans son espace quelqu'un qui voulait
 * relire un article.
 *
 * D'où la distinction faite ici entre taper l'adresse et cliquer un lien. Le
 * navigateur la donne lui-même dans `Sec-Fetch-Site` : `none` pour une adresse
 * saisie, un favori ou l'historique, `same-origin` pour un lien interne. Seule
 * la première mène chez soi ; toutes les autres laissent le site s'afficher.
 *
 * Ce module ne décide rien tout seul : il est appelé par le proxy, qui est le
 * seul endroit où l'aiguillage a lieu.
 */

/**
 * Le cookie de session posé par `@supabase/ssr`, éventuellement découpé en
 * morceaux numérotés quand le jeton dépasse la taille d'un cookie.
 *
 * `-code-verifier`, posé pendant une connexion en cours, n'en est délibérément
 * pas un : il existe avant toute session.
 */
const COOKIE_SESSION = /^sb-.+-auth-token(\.\d+)?$/;

/**
 * Un cookie de session est-il présent ?
 *
 * Sert de raccourci : sans lui, l'accueil est rendu sans réveiller la session
 * ni interroger Supabase, et la page reste gratuite pour un visiteur. Se
 * tromper ne casse rien - un faux négatif affiche le site public à quelqu'un
 * de connecté, exactement ce qui se passait avant.
 */
export function aUneSessionProbable(nomsDeCookies: string[]): boolean {
  return nomsDeCookies.some((nom) => COOKIE_SESSION.test(nom));
}

/**
 * L'adresse a-t-elle été saisie, plutôt que suivie depuis une page du site ?
 *
 * `none` : barre d'adresse, favori, historique. `same-origin` : un lien interne,
 * « Retour au site » compris. `cross-site` : un lien externe ou un résultat de
 * recherche, qu'on laisse arriver sur la page qu'il visait.
 *
 * L'en-tête absent - vieux navigateur - vaut « non » : mieux vaut afficher le
 * site public que détourner à l'aveugle.
 */
export function estArriveeDirecte(
  secFetchSite: string | null,
  secFetchDest: string | null
): boolean {
  // `document` écarte les préchargements et les charges utiles RSC, qui ne sont
  // pas des arrivées mais des requêtes de fond.
  return secFetchSite === "none" && secFetchDest === "document";
}

/** L'espace où reconduire quelqu'un, d'après son rôle. */
export function espaceDuRole(role: string | null | undefined): "/admin" | "/espace" {
  // Un compte sans profil lisible va dans l'espace client : c'est le moins
  // privilégié des deux, et le back-office revérifie de toute façon le rôle.
  return role === "admin" || role === "conseiller" ? "/admin" : "/espace";
}
