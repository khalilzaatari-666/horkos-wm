import type { AssetClass } from "@/lib/patrimoine";
import { formatMAD } from "@/lib/patrimoine";

/** Teintes de la barre, de la classe la plus lourde à la plus légère. */
const TONES = ["#0B1A2E", "#142B47", "#A9784F", "#C9A06C", "#7A7468", "#EFE7D8"];

function tone(index: number): string {
  return TONES[index % TONES.length];
}

/**
 * Répartition par classe d'actifs : une barre empilée et sa légende.
 *
 * Pas de librairie de graphiques — des proportions se rendent en CSS, et une
 * dépendance supplémentaire pèserait sur chaque page de l'espace pour un seul
 * usage.
 */
export function RepartitionBar({ classes }: { classes: AssetClass[] }) {
  if (classes.length === 0) return null;

  return (
    <div>
      <div
        className="flex h-3 rounded-full overflow-hidden bg-cream-deep"
        role="img"
        aria-label={`Répartition : ${classes.map((c) => `${c.label} ${c.share} %`).join(", ")}`}
      >
        {classes.map((c, i) => (
          <div
            key={c.type}
            style={{ width: `${c.share}%`, backgroundColor: tone(i) }}
            className="h-full"
          />
        ))}
      </div>

      <ul className="mt-5 space-y-3">
        {classes.map((c, i) => (
          <li key={c.type} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: tone(i) }}
            />
            <span className="text-[13px] text-ink flex-1 min-w-0 truncate">{c.label}</span>
            <span className="text-[12.5px] text-warm-grey tabular-nums">{formatMAD(c.total)}</span>
            <span className="text-[13px] font-medium text-ink tabular-nums w-14 text-right">
              {c.share.toFixed(1).replace(".", ",")} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
