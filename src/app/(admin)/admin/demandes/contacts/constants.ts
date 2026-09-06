/**
 * Le cycle de vie d'un message de contact, tel que la base l'autorise
 * (`contacts.status check (nouveau, lu, traite)`).
 *
 * Fichier séparé des actions : un module « use server » ne peut exporter que
 * des fonctions asynchrones, et le tableau comme les libellés servent des deux
 * côtés - validation côté serveur, affichage côté page.
 */

export const CONTACT_STATUTS = ["nouveau", "lu", "traite"] as const;
export type ContactStatut = (typeof CONTACT_STATUTS)[number];

export const CONTACT_STATUT_LABELS: Record<
  ContactStatut,
  { label: string; tone: "attente" | "info" | "succes" }
> = {
  nouveau: { label: "Nouveau", tone: "attente" },
  lu: { label: "Lu", tone: "info" },
  traite: { label: "Traité", tone: "succes" },
};

/**
 * Ce qu'on propose de faire depuis un statut courant : `nouveau → traité`, et
 * le retour en arrière.
 *
 * **`lu` n'est plus proposé.** La lecture est portée par `contacts.read_at`,
 * renseigné à l'ouverture du message (migration 020), et c'est elle qui éteint
 * la pastille rouge. Un bouton « Marquer lu » ferait donc exister deux « lu »
 * distincts, dont celui qu'on peut cliquer n'est pas celui qu'on voit : au
 * moment où le bouton devient atteignable, il a fallu ouvrir le message, donc
 * la pastille est déjà éteinte. Les deux axes restent séparés et lisibles - la
 * pastille dit « quelqu'un l'a vu », le badge dit « quelqu'un s'en est occupé ».
 *
 * Le statut reste dans `CONTACT_STATUTS` : la contrainte de la base l'autorise
 * toujours, et les messages déjà classés `lu` doivent continuer de s'afficher
 * et de pouvoir avancer.
 */
export const CONTACT_TRANSITIONS: Record<ContactStatut, { vers: ContactStatut; label: string }[]> = {
  nouveau: [{ vers: "traite", label: "Marquer traité" }],
  lu: [
    { vers: "traite", label: "Marquer traité" },
    { vers: "nouveau", label: "Rouvrir" },
  ],
  traite: [{ vers: "nouveau", label: "Rouvrir" }],
};
