import { assetTypeLabel } from "@/lib/patrimoine";
import type { FicheAudit } from "./schema";

/**
 * Ce que la fiche d'audit apporte au patrimoine du client.
 *
 * L'audit établit le patrimoine : le ressaisir ensuite dans l'onglet Patrimoine
 * serait deux fois le même travail, et deux occasions de diverger. Les lignes
 * ci-dessous sont donc reversées dans `assets`, d'où sortent le total, la
 * répartition et le tableau de bord du client.
 *
 * Chaque actif garde une clé stable : un enregistrement ultérieur met à jour la
 * ligne existante au lieu d'en créer une seconde. Les actifs saisis à la main
 * dans l'onglet Patrimoine n'ont pas de clé et ne sont jamais touchés.
 */

export interface ActifDeFiche {
  /** Identifie la ligne d'une fiche à l'autre. */
  cle: string;
  type: string;
  label: string;
  valeur: number;
}

function libelleLigne(libelle: string, type: string, defaut: string): string {
  const propre = libelle.trim();
  if (propre) return propre;
  return type ? assetTypeLabel(type) : defaut;
}

/**
 * Les actifs déductibles de la fiche, dans l'ordre où le conseiller les a
 * saisis.
 *
 * Seules les lignes valorisées ressortent : une ligne à zéro est une ligne que
 * le conseiller n'a pas encore remplie, pas un actif qui ne vaut rien.
 */
export function actifsDeLaFiche(fiche: FicheAudit): ActifDeFiche[] {
  const actifs: ActifDeFiche[] = [];

  fiche.financier.forEach((ligne, i) => {
    if (!(ligne.valeur > 0)) return;
    actifs.push({
      cle: `financier:${i}`,
      type: ligne.type || "autre",
      label: libelleLigne(ligne.libelle, ligne.type, "Placement financier"),
      valeur: ligne.valeur,
    });
  });

  const rp = fiche.immobilier.residencePrincipale;
  if (rp.valeurEstimee > 0) {
    actifs.push({
      cle: "immobilier:residence-principale",
      type: "immobilier",
      label: rp.adresse.trim()
        ? `Résidence principale - ${rp.adresse.trim()}`
        : "Résidence principale",
      valeur: rp.valeurEstimee,
    });
  }

  fiche.immobilier.locatifs.forEach((bien, i) => {
    if (!(bien.valeurEstimee > 0)) return;
    actifs.push({
      cle: `immobilier:locatif:${i}`,
      type: "immobilier",
      label: bien.adresse.trim() ? `Locatif - ${bien.adresse.trim()}` : `Bien locatif ${i + 1}`,
      valeur: bien.valeurEstimee,
    });
  });

  return actifs;
}

export interface ActifExistant {
  id: string;
  cle: string;
  valeur: number;
}

export interface Reconciliation<T extends ActifExistant> {
  aCreer: ActifDeFiche[];
  aMettreAJour: { existant: T; actif: ActifDeFiche }[];
  aSupprimer: T[];
}

/**
 * Compare ce que la fiche décrit à ce que la base contient déjà.
 *
 * Une ligne retirée de la fiche retire son actif : sans quoi un bien vendu et
 * effacé de l'audit continuerait de gonfler le patrimoine affiché au client.
 */
export function reconcilier<T extends ActifExistant>(
  souhaites: ActifDeFiche[],
  existants: T[]
): Reconciliation<T> {
  const parCle = new Map(existants.map((e) => [e.cle, e]));
  const aCreer: ActifDeFiche[] = [];
  const aMettreAJour: { existant: T; actif: ActifDeFiche }[] = [];

  for (const actif of souhaites) {
    const existant = parCle.get(actif.cle);
    if (existant) {
      aMettreAJour.push({ existant, actif });
      parCle.delete(actif.cle);
    } else {
      aCreer.push(actif);
    }
  }

  return { aCreer, aMettreAJour, aSupprimer: [...parCle.values()] };
}
