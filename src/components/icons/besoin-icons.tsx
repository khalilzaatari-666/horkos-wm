/**
 * Hand-drawn 24x24 icon set for the "besoins" carousel.
 *
 * Every icon is authored as open stroke geometry so it can be traced on with
 * DrawSVGPlugin. `fill` holds the subset of shapes that are closed, used only
 * by the duotone variant as a flat bronze wash behind the stroke.
 */

export type BesoinIconName =
  | "diversifier"
  | "fiscalite"
  | "retraite"
  | "transmettre"
  | "patrimoine"
  | "societe"
  | "collaborateurs"
  | "tresorerie";

interface IconGeometry {
  stroke: React.ReactNode;
  fill?: React.ReactNode;
}

const geometry: Record<BesoinIconName, IconGeometry> = {
  // Pie split into parts — répartition du capital.
  diversifier: {
    fill: <path d="M12 3.5a8.5 8.5 0 0 1 7.6 12.7L12 12z" />,
    stroke: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5V12l7.6 4.2" />
      </>
    ),
  },

  // Sheet with a percent sign — la fiscalité, sur le papier.
  fiscalite: {
    fill: <path d="M6 3.5h7.5L18 8v12.5H6z" />,
    stroke: (
      <>
        <path d="M6 3.5h7.5L18 8v12.5H6z" />
        <path d="M13.5 3.5V8H18" />
        <circle cx="10" cy="12" r="1.15" />
        <circle cx="14" cy="16.4" r="1.15" />
        <path d="M14.9 11.1 9.1 17.3" />
      </>
    ),
  },

  // Hourglass — le temps qu'on prépare.
  retraite: {
    fill: <path d="M8.6 3.5h6.8v3.2c0 1.2-.5 2.3-1.4 3.1L12 12l-2 2.2c-.9.8-1.4 1.9-1.4 3.1v3.2h6.8v-3.2c0-1.2-.5-2.3-1.4-3.1L12 12l2-2.2c.9-.8 1.4-1.9 1.4-3.1z" />,
    stroke: (
      <>
        <path d="M7.5 3.5h9M7.5 20.5h9" />
        <path d="M8.6 3.5v3.2c0 1.2.5 2.3 1.4 3.1L12 12l-2 2.2c-.9.8-1.4 1.9-1.4 3.1v3.2" />
        <path d="M15.4 3.5v3.2c0 1.2-.5 2.3-1.4 3.1L12 12l2 2.2c.9.8 1.4 1.9 1.4 3.1v3.2" />
      </>
    ),
  },

  // A grown-up and a child — la génération suivante.
  transmettre: {
    fill: (
      <>
        <circle cx="8.5" cy="7" r="2.7" />
        <circle cx="17" cy="11.2" r="2.1" />
      </>
    ),
    stroke: (
      <>
        <circle cx="8.5" cy="7" r="2.7" />
        <path d="M3.8 20.5v-2.2a4.7 4.7 0 0 1 9.4 0v2.2" />
        <circle cx="17" cy="11.2" r="2.1" />
        <path d="M13.9 20.5v-1.7a3.2 3.2 0 0 1 6.3 0v1.7" />
      </>
    ),
  },

  // Stacked strata — des actifs rangés en couches.
  patrimoine: {
    fill: <path d="M12 3.4 3.4 8 12 12.6 20.6 8z" />,
    stroke: (
      <>
        <path d="M12 3.4 3.4 8 12 12.6 20.6 8z" />
        <path d="M3.4 12.2 12 16.8l8.6-4.6" />
        <path d="M3.4 16.4 12 21l8.6-4.6" />
      </>
    ),
  },

  // Org chart — une structure qu'on dessine.
  societe: {
    fill: (
      <>
        <rect x="8.8" y="2.8" width="6.4" height="4.8" rx="1.2" />
        <rect x="2.8" y="16.4" width="6.4" height="4.8" rx="1.2" />
        <rect x="14.8" y="16.4" width="6.4" height="4.8" rx="1.2" />
      </>
    ),
    stroke: (
      <>
        <rect x="8.8" y="2.8" width="6.4" height="4.8" rx="1.2" />
        <rect x="2.8" y="16.4" width="6.4" height="4.8" rx="1.2" />
        <rect x="14.8" y="16.4" width="6.4" height="4.8" rx="1.2" />
        <path d="M12 7.6V12M6 16.4V12h12v4.4" />
      </>
    ),
  },

  // Someone, and a seal of approval — l'équipe qu'on retient.
  collaborateurs: {
    fill: (
      <>
        <circle cx="9.6" cy="7.4" r="3.1" />
        <circle cx="17.4" cy="17" r="4.1" />
      </>
    ),
    stroke: (
      <>
        <circle cx="9.6" cy="7.4" r="3.1" />
        <path d="M3.6 20.6v-1.8a5.1 5.1 0 0 1 5.1-5.1h2.4" />
        <circle cx="17.4" cy="17" r="4.1" />
        <path d="m15.6 17 1.3 1.3 2.4-2.6" />
      </>
    ),
  },

  // A stack of coins that goes up — la trésorerie qui travaille.
  tresorerie: {
    fill: <path d="M9.2 3.6c3 0 5.5 1.1 5.5 2.4v10.4c0 1.3-2.5 2.4-5.5 2.4s-5.5-1.1-5.5-2.4V6c0-1.3 2.5-2.4 5.5-2.4z" />,
    stroke: (
      <>
        <ellipse cx="9.2" cy="6" rx="5.5" ry="2.4" />
        <path d="M3.7 6v10.4c0 1.3 2.5 2.4 5.5 2.4s5.5-1.1 5.5-2.4V6" />
        <path d="M3.7 11.2c0 1.3 2.5 2.4 5.5 2.4s5.5-1.1 5.5-2.4" />
        <path d="M19.4 20.4V9.6m0 0-2.3 2.3m2.3-2.3 2.3 2.3" />
      </>
    ),
  },
};

export type BesoinIconVariant = "line" | "duotone" | "inverted";

const strokeWidths: Record<BesoinIconVariant, number> = {
  line: 1.25,
  duotone: 1.5,
  inverted: 1.75,
};

interface BesoinIconProps {
  name: BesoinIconName;
  variant?: BesoinIconVariant;
  className?: string;
}

export function BesoinIcon({ name, variant = "line", className = "" }: BesoinIconProps) {
  const { stroke, fill } = geometry[name];

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidths[variant]}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {variant === "duotone" && fill && (
        <g fill="currentColor" stroke="none" opacity={0.16}>
          {fill}
        </g>
      )}
      <g data-icon-stroke>{stroke}</g>
    </svg>
  );
}
