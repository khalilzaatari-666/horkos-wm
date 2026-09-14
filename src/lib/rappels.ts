/**
 * L'échéance d'un rappel de relance.
 *
 * Le conseiller ne saisit pas une date mais un délai — « dans trois jours »,
 * « dans deux mois » — parce que c'est ainsi qu'il y pense en sortant du
 * rendez-vous. Le calcul vit ici, à part du formulaire et de l'action serveur :
 * les deux s'en servent, et le résultat affiché avant validation doit être
 * exactement celui qui sera enregistré.
 */

export const UNITES = ["heures", "jours", "mois"] as const;
export type Unite = (typeof UNITES)[number];

export const UNITE_LABELS: Record<Unite, { singulier: string; pluriel: string }> = {
  heures: { singulier: "heure", pluriel: "heures" },
  jours: { singulier: "jour", pluriel: "jours" },
  mois: { singulier: "mois", pluriel: "mois" },
};

/**
 * Horizon maximal, en mois. Au-delà, ce n'est plus une relance : le dossier
 * aura changé, et un rappel oublié depuis deux ans arriverait comme une
 * incongruité.
 */
export const HORIZON_MAX_MOIS = 24;

const HEURE_MS = 3_600_000;
const JOUR_MS = 24 * HEURE_MS;

/** Bornes par unité, pour que le formulaire et le serveur refusent la même chose. */
export const QUANTITE_MAX: Record<Unite, number> = {
  heures: HORIZON_MAX_MOIS * 30 * 24,
  jours: HORIZON_MAX_MOIS * 30,
  mois: HORIZON_MAX_MOIS,
};

/**
 * `depuis` + `quantite` unités, ou `null` si la demande n'a pas de sens.
 *
 * Heures et jours sont de l'arithmétique absolue : un rappel « dans 48 heures »
 * doit tomber 48 heures plus tard, même si le pays change d'heure entre-temps -
 * c'est un minuteur, pas un rendez-vous.
 *
 * Les mois passent au contraire par le calendrier : « dans deux mois » veut dire
 * la même date deux mois plus loin, pas soixante jours.
 *
 * Ce report se fait en UTC (`setUTCMonth`), et non en heure locale. `setMonth`
 * lirait le fuseau de la machine : le même appel donnerait une heure d'écart
 * entre un poste à Casablanca et le serveur Vercel, qui tourne en UTC - et
 * l'écart apparaîtrait ou non selon que le trajet franchit un changement
 * d'heure. En UTC le calcul est le même partout, et le décalage résiduel avec
 * la pendule du cabinet vaut au pire une heure, sur une fonction dont le cron
 * n'offre de toute façon qu'une résolution horaire.
 *
 * Les fins de mois impossibles débordent sur le mois suivant (31 janvier + 1
 * mois → 3 mars) ; sans conséquence pour un pense-bête, et verrouillé par un
 * test pour que le comportement soit constaté plutôt que subi.
 */
export function echeance(depuis: Date, quantite: number, unite: Unite): Date | null {
  if (!Number.isInteger(quantite) || quantite < 1) return null;
  if (quantite > QUANTITE_MAX[unite]) return null;
  if (Number.isNaN(depuis.getTime())) return null;

  if (unite === "heures") return new Date(depuis.getTime() + quantite * HEURE_MS);
  if (unite === "jours") return new Date(depuis.getTime() + quantite * JOUR_MS);

  const d = new Date(depuis.getTime());
  d.setUTCMonth(d.getUTCMonth() + quantite);
  return d;
}

/**
 * Qui reçoit le rappel.
 *
 * La direction est toujours en copie : c'est elle qui répond du suivi des
 * dossiers. Côté conseillers, un seul est concerné quand le client a un
 * référent ; sans référent, personne n'est nommément responsable et le rappel
 * part à toute l'équipe plutôt que de se perdre.
 *
 * Les doublons sont écartés - un référent qui serait aussi administrateur ne
 * doit pas recevoir deux fois le même message.
 */
export function destinatairesRappel(
  referent: string | null,
  admins: string[],
  equipe: string[]
): string[] {
  const propres = (liste: string[]) => liste.map((e) => e.trim()).filter(Boolean);
  const retenus = referent?.trim()
    ? [referent.trim(), ...propres(admins)]
    : propres(equipe);
  return [...new Set(retenus)];
}

/** « 3 jours », « 1 heure », « 2 mois » - l'accord se fait ici, une seule fois. */
export function libelleDelai(quantite: number, unite: Unite): string {
  const mots = UNITE_LABELS[unite];
  return `${quantite} ${quantite > 1 ? mots.pluriel : mots.singulier}`;
}
