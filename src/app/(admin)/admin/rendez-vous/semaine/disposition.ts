/**
 * Répartition des rendez-vous qui se chevauchent dans une même journée.
 *
 * Deux conseillers peuvent recevoir à la même heure, et un rendez-vous posé à
 * la main ne tombe pas forcément sur la grille : 9h00-10h00 et 9h30-10h30 se
 * recouvrent sans partager de créneau. Les empiler les cacherait l'un derrière
 * l'autre, les mettre systématiquement côte à côte réduirait toute la journée à
 * des colonnes minuscules.
 *
 * On procède donc par grappes : une suite de rendez-vous qui se touchent de
 * proche en proche partage sa largeur, et une grappe suivante repart pleine
 * largeur.
 */

export interface Intervalle {
  /** Minutes depuis minuit. */
  debut: number;
  fin: number;
}

export interface Place {
  /** Rang horizontal dans la grappe, à partir de 0. */
  colonne: number;
  /** Nombre de colonnes de la grappe - le dénominateur de la largeur. */
  total: number;
}

/**
 * Rend une place par intervalle, dans l'ordre reçu.
 *
 * Les intervalles vides ou inversés sont traités comme des points : ils
 * prennent une place, sans jamais faire rétrécir leurs voisins au-delà.
 */
export function disposer(intervalles: Intervalle[]): Place[] {
  const places: Place[] = intervalles.map(() => ({ colonne: 0, total: 1 }));

  // Trier par début, puis par fin : deux rendez-vous simultanés gardent un ordre
  // stable d'un rendu à l'autre plutôt que celui, arbitraire, de la requête.
  const ordre = intervalles
    .map((_, i) => i)
    .sort((a, b) => {
      const d = intervalles[a].debut - intervalles[b].debut;
      return d !== 0 ? d : intervalles[a].fin - intervalles[b].fin;
    });

  // Une grappe en cours : les index qui la composent, et la fin la plus tardive
  // atteinte jusqu'ici. Un rendez-vous qui commence après cette fin n'a plus
  // rien à partager avec elle.
  let grappe: number[] = [];
  let finGrappe = -Infinity;
  // Fin du dernier rendez-vous posé dans chaque colonne de la grappe.
  let colonnes: number[] = [];

  const clore = () => {
    for (const i of grappe) places[i].total = colonnes.length || 1;
    grappe = [];
    colonnes = [];
    finGrappe = -Infinity;
  };

  for (const i of ordre) {
    const { debut, fin } = intervalles[i];
    if (grappe.length && debut >= finGrappe) clore();

    // Première colonne libérée par son occupant précédent, sinon une nouvelle.
    let colonne = colonnes.findIndex((f) => f <= debut);
    if (colonne === -1) {
      colonne = colonnes.length;
      colonnes.push(fin);
    } else {
      colonnes[colonne] = fin;
    }

    places[i].colonne = colonne;
    grappe.push(i);
    finGrappe = Math.max(finGrappe, fin);
  }

  clore();
  return places;
}
