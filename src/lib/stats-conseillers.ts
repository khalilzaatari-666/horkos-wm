/**
 * Statistiques hebdomadaires d'activité par conseiller.
 *
 * La règle d'or du cabinet : chaque conseiller tient au moins 10 R0, 5 R1 et
 * 3 R2 par semaine. Le tableau de bord confronte chaque compteur à cet objectif
 * et le colore : vert quand il est atteint, jaune quand on s'en approche, rouge
 * quand on en est loin.
 *
 * Deux lectures d'un même rendez-vous :
 * - « tenu » : statut `termine`, daté dans la semaine. C'est l'étape réellement
 *   menée avec le client.
 * - « fixé » : créé dans la semaine et non annulé, pour les R1 et R2 seulement.
 *   Ce sont les étapes que le conseiller a posées avec ses clients, quelle que
 *   soit la date à laquelle elles se tiendront. Le R0 n'en fait pas partie : il
 *   est pris par le visiteur, pas par le conseiller.
 */

import type { RdvType } from "@/app/(admin)/admin/rendez-vous/constants";

export const ETAPES: readonly RdvType[] = ["R0", "R1", "R2"];

/** Rendez-vous à tenir par conseiller et par semaine. */
export const OBJECTIFS_HEBDO: Record<RdvType, number> = { R0: 10, R1: 5, R2: 3 };

export type Niveau = "atteint" | "proche" | "loin";

/** Sous ce ratio de l'objectif, on est « loin » ; au-dessus, « proche ». */
const SEUIL_PROCHE = 0.6;

/** Où en est un compteur par rapport à son objectif. */
export function niveauObjectif(fait: number, objectif: number): Niveau {
  if (fait >= objectif) return "atteint";
  if (fait >= objectif * SEUIL_PROCHE) return "proche";
  return "loin";
}

export interface StatsConseiller {
  id: string;
  nom: string;
  tenus: Record<RdvType, number>;
  fixes: Record<Exclude<RdvType, "R0">, number>;
}

interface RdvTenu {
  advisor_id: string | null;
  type: string;
}

interface RdvFixe {
  advisor_id: string | null;
  type: string;
}

const zeros = (): Record<RdvType, number> => ({ R0: 0, R1: 0, R2: 0 });

/**
 * Ventile deux listes déjà filtrées par la base (les tenus de la semaine, les
 * fixés de la semaine) par conseiller. Tout conseiller de l'équipe a sa ligne,
 * même sans rendez-vous : une semaine vide doit se voir, pas disparaître.
 */
export function agregerStats(
  conseillers: { id: string; nom: string }[],
  tenus: RdvTenu[],
  fixes: RdvFixe[]
): StatsConseiller[] {
  const parId = new Map<string, StatsConseiller>(
    conseillers.map((c) => [c.id, { id: c.id, nom: c.nom, tenus: zeros(), fixes: { R1: 0, R2: 0 } }])
  );

  for (const r of tenus) {
    const s = r.advisor_id ? parId.get(r.advisor_id) : undefined;
    if (s && (ETAPES as readonly string[]).includes(r.type)) s.tenus[r.type as RdvType] += 1;
  }
  for (const r of fixes) {
    const s = r.advisor_id ? parId.get(r.advisor_id) : undefined;
    if (s && (r.type === "R1" || r.type === "R2")) s.fixes[r.type] += 1;
  }

  return [...parId.values()];
}
