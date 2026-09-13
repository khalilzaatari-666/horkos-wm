import Link from "next/link";
import { AdminCard } from "@/components/admin/ui";
import { formatDateLong } from "@/lib/dates";
import { ajouterJours } from "@/lib/cabinet-time";
import {
  ETAPES,
  OBJECTIFS_HEBDO,
  niveauObjectif,
  type Niveau,
  type StatsConseiller,
} from "@/lib/stats-conseillers";

/** Vert : objectif atteint. Jaune : on s'en approche. Rouge : on en est loin. */
const NIVEAU_CLASSES: Record<Niveau, string> = {
  atteint: "bg-emerald-50 text-emerald-700 border-emerald-200",
  proche: "bg-amber-50 text-amber-700 border-amber-200",
  loin: "bg-red-50 text-red-700 border-red-200",
};

const NIVEAU_LABELS: Record<Niveau, string> = {
  atteint: "objectif atteint",
  proche: "proche de l'objectif",
  loin: "loin de l'objectif",
};

function Compteur({ fait, objectif }: { fait: number; objectif: number }) {
  const niveau = niveauObjectif(fait, objectif);
  return (
    <span
      className={`inline-flex items-baseline gap-1 px-2.5 py-1 rounded-md border font-semibold tabular-nums ${NIVEAU_CLASSES[niveau]}`}
      title={NIVEAU_LABELS[niveau]}
    >
      <span className="text-[14px]">{fait}</span>
      <span className="text-[11px] font-medium opacity-70">/ {objectif}</span>
      <span className="sr-only">, {NIVEAU_LABELS[niveau]}</span>
    </span>
  );
}

const th =
  "px-5 py-3 text-[11px] font-semibold tracking-[1.2px] uppercase text-warm-grey whitespace-nowrap";
const td = "px-5 py-3 text-[13px] text-charcoal whitespace-nowrap";
const flecheClasse =
  "grid place-items-center w-8 h-8 rounded-lg border border-cream-deep bg-white text-charcoal hover:border-bronze/50 hover:text-bronze-dark transition-colors";

/**
 * L'activité de la semaine, conseiller par conseiller, face à la règle d'or
 * (10 R0, 5 R1, 3 R2 tenus par semaine). Réservé à l'admin : un conseiller n'a
 * pas à comparer ses chiffres à ceux de ses collègues.
 */
export function StatsConseillers({
  stats,
  lundi,
  semaineCourante,
  lienSemaine,
}: {
  stats: StatsConseiller[];
  lundi: string;
  semaineCourante: string;
  /** Absent quand la page porte déjà sa propre navigation de semaine (agenda). */
  lienSemaine?: (lundi: string) => string;
}) {
  return (
    <section className="mb-8" aria-labelledby="stats-conseillers">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {lienSemaine && (
            <>
              <Link href={lienSemaine(ajouterJours(lundi, -7))} className={flecheClasse} aria-label="Semaine précédente" scroll={false}>
                <span aria-hidden="true">‹</span>
              </Link>
              <Link href={lienSemaine(ajouterJours(lundi, 7))} className={flecheClasse} aria-label="Semaine suivante" scroll={false}>
                <span aria-hidden="true">›</span>
              </Link>
            </>
          )}
          <h2 id="stats-conseillers" className={`font-heading text-[16px] font-semibold text-ink `}>
            Activité des conseillers · semaine du {formatDateLong(`${lundi}T12:00:00Z`)}
          </h2>
          {lienSemaine && lundi !== semaineCourante && (
            <Link
              href={lienSemaine(semaineCourante)}
              scroll={false}
              className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium transition-colors ml-1"
            >
              Cette semaine
            </Link>
          )}
        </div>
        <p className="text-[12px] text-warm-grey">
          Règle d&apos;or : {OBJECTIFS_HEBDO.R0} R0, {OBJECTIFS_HEBDO.R1} R1 et {OBJECTIFS_HEBDO.R2} R2 tenus par
          semaine.
        </p>
      </div>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-cream-deep">
                <th className={th} rowSpan={2}>Conseiller</th>
                <th className={`${th} text-center border-l border-cream-deep`} colSpan={3}>
                  Tenus
                </th>
                <th className={`${th} text-center border-l border-cream-deep`} colSpan={2}>
                  Fixés avec des clients
                </th>
              </tr>
              <tr className="border-b border-cream-deep">
                {ETAPES.map((e, i) => (
                  <th key={`t-${e}`} className={`${th} text-center ${i === 0 ? "border-l border-cream-deep" : ""}`}>
                    {e}
                  </th>
                ))}
                <th className={`${th} text-center border-l border-cream-deep`}>R1</th>
                <th className={`${th} text-center`}>R2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-deep">
              {stats.length === 0 && (
                <tr>
                  <td className={`${td} text-warm-grey`} colSpan={6}>
                    Aucun conseiller dans l&apos;équipe.
                  </td>
                </tr>
              )}
              {stats.map((s) => (
                <tr key={s.id}>
                  <td className={`${td} font-medium text-ink`}>{s.nom}</td>
                  {ETAPES.map((e, i) => (
                    <td key={`t-${e}`} className={`${td} text-center ${i === 0 ? "border-l border-cream-deep" : ""}`}>
                      <Compteur fait={s.tenus[e]} objectif={OBJECTIFS_HEBDO[e]} />
                    </td>
                  ))}
                  <td className={`${td} text-center tabular-nums border-l border-cream-deep`}>{s.fixes.R1}</td>
                  <td className={`${td} text-center tabular-nums`}>{s.fixes.R2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
      <p className="text-[11.5px] text-warm-grey mt-2">
        « Tenus » : rendez-vous marqués terminés et datés dans la semaine. « Fixés » : R1 et R2 posés
        durant la semaine, non annulés, quelle que soit leur date.
      </p>
    </section>
  );
}
