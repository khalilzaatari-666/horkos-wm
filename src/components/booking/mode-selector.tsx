"use client";

export type RdvMode = "presentiel" | "visio";

const MODES: { value: RdvMode; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: "presentiel",
    label: "Au cabinet",
    desc: "En personne, à Casablanca.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21h18M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    value: "visio",
    label: "En visio",
    desc: "Lien Google Meet envoyé par email.",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="m22 8-6 4 6 4z" />
      </svg>
    ),
  },
];

/**
 * Présentiel ou visio. Pas de valeur par défaut : un mauvais mode réservé en
 * silence coûte un déplacement ou une réunion fantôme, le choix doit être
 * conscient.
 */
export function ModeSelector({
  value,
  onChange,
}: {
  value: RdvMode | null;
  onChange: (mode: RdvMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Format du rendez-vous">
      {MODES.map((mode) => {
        const selected = value === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(mode.value)}
            className={`flex items-start gap-3 text-left px-4 py-3.5 rounded-lg border transition-all duration-200 cursor-pointer ${
              selected
                ? "border-bronze bg-bronze/10"
                : "border-cream-deep bg-white hover:border-bronze/50"
            }`}
          >
            <span className={`shrink-0 mt-0.5 ${selected ? "text-bronze-dark" : "text-warm-grey"}`}>
              {mode.icon}
            </span>
            <span className="min-w-0">
              <span className={`block text-[13.5px] leading-[1.35] ${selected ? "text-ink font-medium" : "text-charcoal"}`}>
                {mode.label}
              </span>
              <span className="block text-[11.5px] text-warm-grey mt-0.5 leading-[1.45]">
                {mode.desc}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
