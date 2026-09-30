/** Constantes partagées entre la page serveur et la barre de filtres cliente. */

export const RDV_STATUTS = ["planifie", "confirme", "termine", "non_honore", "annule"] as const;
export type RdvStatut = (typeof RDV_STATUTS)[number];

interface Style {
  label: string;
  pill: string;
  dot: string;
}

export const RDV_STATUT_STYLES: Record<RdvStatut, Style> = {
  planifie: {
    label: "Planifié",
    pill: "bg-bronze/12 text-bronze-dark border-bronze/30",
    dot: "bg-bronze",
  },
  confirme: {
    label: "Confirmé",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  termine: {
    label: "Terminé",
    pill: "bg-ink/[0.06] text-ink border-ink/15",
    dot: "bg-ink",
  },
  // Le client n'est pas venu : ni tenu ni annulé, compté comme manqué.
  non_honore: {
    label: "Non honoré",
    pill: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  annule: {
    label: "Annulé",
    pill: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
};

export const PERIODES = ["avenir", "passes", "tous"] as const;
export type Periode = (typeof PERIODES)[number];

export const PERIODE_LABELS: Record<Periode, string> = {
  avenir: "À venir",
  passes: "Passés",
  tous: "Toute période",
};

/**
 * Les étapes du parcours, dans l'ordre. Il n'y en a que trois.
 *
 * D'autres valeurs existent dans `appointments.type` - un point de suivi, un
 * échange - mais ce ne sont pas des étapes : elles ne sont donc pas proposées au
 * filtre. Sans filtre, elles restent évidemment visibles dans la liste.
 */
export const RDV_TYPES = ["R0", "R1", "R2"] as const;
export type RdvType = (typeof RDV_TYPES)[number];

/** Le code est gardé devant le libellé : c'est par lui que l'équipe les nomme. */
export const RDV_TYPE_LABELS: Record<RdvType, string> = {
  R0: "R0 · Audit patrimonial",
  R1: "R1 · Stratégie",
  R2: "R2 · Gouvernance",
};

export const MODES = ["presentiel", "visio"] as const;
export const MODE_LABELS: Record<string, string> = {
  presentiel: "Au cabinet",
  visio: "En visio",
};

export const TRIS = ["date", "client", "conseiller", "statut"] as const;
export type Tri = (typeof TRIS)[number];

/** Valeurs par défaut : on ouvre sur ce qui arrive, du plus proche au plus loin. */
export const DEFAULTS = { periode: "avenir" as Periode, tri: "date" as Tri, sens: "asc" };

/** Au-delà, il faudra paginer plutôt que tout charger. */
export const MAX_ROWS = 500;
