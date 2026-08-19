/** Constantes partagées entre la page serveur et la barre de filtres cliente. */

export const RDV_STATUTS = ["planifie", "confirme", "termine", "annule"] as const;
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
