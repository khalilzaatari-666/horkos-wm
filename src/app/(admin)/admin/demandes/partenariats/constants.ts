/**
 * Le cycle de vie d'une demande de partenariat, tel que la base l'autorise
 * (`partner_submissions.status check (nouveau, en_revue, accepte, rejete)`).
 *
 * Fichier séparé des actions : un module « use server » ne peut exporter que
 * des fonctions asynchrones.
 */

export const PARTENAIRE_STATUTS = ["nouveau", "en_revue", "accepte", "rejete"] as const;
export type PartenaireStatut = (typeof PARTENAIRE_STATUTS)[number];

export const PARTENAIRE_STATUT_LABELS: Record<
  PartenaireStatut,
  { label: string; tone: "attente" | "info" | "succes" | "refus" }
> = {
  nouveau: { label: "Nouveau", tone: "attente" },
  en_revue: { label: "En revue", tone: "info" },
  accepte: { label: "Accepté", tone: "succes" },
  rejete: { label: "Non retenu", tone: "refus" },
};

/**
 * Les gestes proposés depuis chaque statut. Une demande tranchée peut être
 * rouverte : un partenaire écarté une année se représente la suivante.
 */
export const PARTENAIRE_TRANSITIONS: Record<
  PartenaireStatut,
  { vers: PartenaireStatut; label: string }[]
> = {
  nouveau: [
    { vers: "en_revue", label: "Mettre en revue" },
    { vers: "accepte", label: "Accepter" },
    { vers: "rejete", label: "Écarter" },
  ],
  en_revue: [
    { vers: "accepte", label: "Accepter" },
    { vers: "rejete", label: "Écarter" },
  ],
  accepte: [{ vers: "en_revue", label: "Rouvrir" }],
  rejete: [{ vers: "en_revue", label: "Rouvrir" }],
};
