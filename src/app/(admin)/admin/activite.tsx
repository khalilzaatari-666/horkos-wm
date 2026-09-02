import { AdminCard } from "@/components/admin/ui";

/**
 * L'activité du site, telle que la base peut la raconter.
 *
 * Aucune de ces mesures n'est une visite : le site ne journalise pas les
 * passages. Ce qui est compté ici, ce sont des actes - une inscription, une
 * demande, un téléchargement - c'est-à-dire ce qui a laissé une ligne quelque
 * part. Les taux en tirent le reste.
 *
 * Les deux séries du graphique se lisent sur le même axe parce qu'elles se
 * comptent dans la même unité. Leurs couleurs sont validées pour la vision des
 * couleurs (écart ΔE 20 en protanopie) et doublées d'une légende : la teinte
 * n'est jamais seule à porter l'identité d'une série.
 */

export const SERIE_INSCRIPTIONS = "#B87333";
export const SERIE_RENDEZ_VOUS = "#1F7FBF";

export interface Serie {
  label: string;
  color: string;
  values: number[];
}

function Variation({ actuel, precedent }: { actuel: number; precedent: number }) {
  if (precedent === 0) {
    return (
      <span className="text-[11.5px] text-warm-grey">
        {actuel > 0 ? "sans point de comparaison" : "aucun sur la période"}
      </span>
    );
  }

  const ecart = Math.round(((actuel - precedent) / precedent) * 100);
  const stable = ecart === 0;

  return (
    <span
      className={`text-[11.5px] font-medium ${
        stable ? "text-warm-grey" : ecart > 0 ? "text-emerald-700" : "text-red-600"
      }`}
    >
      {stable ? "stable" : `${ecart > 0 ? "+" : ""}${ecart} %`}
      <span className="text-warm-grey font-normal"> vs 30 j précédents</span>
    </span>
  );
}

export function TuileActivite({
  label,
  actuel,
  precedent,
}: {
  label: string;
  actuel: number;
  precedent: number;
}) {
  return (
    <AdminCard className="p-5 h-full">
      <div className="text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey">
        {label}
      </div>
      <div className="font-heading text-[26px] font-semibold text-ink mt-2 leading-none">
        {actuel}
      </div>
      <div className="mt-2">
        <Variation actuel={actuel} precedent={precedent} />
      </div>
    </AdminCard>
  );
}

/**
 * Un taux, avec son numérateur et son dénominateur écrits en toutes lettres :
 * « 40 % » ne veut rien dire tant qu'on ignore si c'est 2 sur 5 ou 200 sur 500.
 */
export function TuileTaux({
  label,
  numerateur,
  denominateur,
  detail,
}: {
  label: string;
  numerateur: number;
  denominateur: number;
  detail: string;
}) {
  const taux = denominateur > 0 ? Math.round((numerateur / denominateur) * 100) : null;

  return (
    <AdminCard className="p-5 h-full">
      <div className="text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey">
        {label}
      </div>
      <div className="font-heading text-[26px] font-semibold text-ink mt-2 leading-none">
        {taux === null ? "-" : `${taux} %`}
      </div>
      <div className="text-[11.5px] text-warm-grey mt-2">
        {denominateur > 0 ? `${numerateur} sur ${denominateur} · ${detail}` : detail}
      </div>
    </AdminCard>
  );
}

/**
 * Douze semaines en barres groupées.
 *
 * Barres et non courbes : douze points espacés d'une semaine sont des paquets
 * distincts, pas un flux continu. Pas d'étiquette sur chaque barre - la valeur
 * exacte est dans l'infobulle et dans le tableau lu par les lecteurs d'écran.
 */
export function GrapheActivite({ semaines, series }: { semaines: string[]; series: Serie[] }) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));

  return (
    <AdminCard className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <h2 className="font-heading text-[17.5px] font-semibold text-ink">
          Activité des 12 dernières semaines
        </h2>
        <div className="flex items-center gap-4">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-[12px] text-charcoal">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-[2px]"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        {/* Repère haut, discret : sans lui, la hauteur des barres n'a pas d'échelle. */}
        <div className="absolute inset-x-0 top-0 border-t border-cream-deep" aria-hidden="true">
          <span className="absolute -top-2 right-0 text-[10.5px] text-warm-grey bg-white pl-1.5">
            {max}
          </span>
        </div>

        <div className="flex items-end gap-1.5 h-[140px] pt-3" role="presentation">
          {semaines.map((semaine, i) => (
            <div key={semaine} className="flex-1 flex items-end justify-center gap-[2px] h-full">
              {series.map((s) => {
                const valeur = s.values[i] ?? 0;
                return (
                  <div
                    key={s.label}
                    title={`${semaine} — ${s.label} : ${valeur}`}
                    className="flex-1 max-w-[14px] rounded-t-[4px] transition-opacity hover:opacity-75"
                    style={{
                      backgroundColor: s.color,
                      // 2px plancher : une semaine à zéro doit rester lisible
                      // comme un creux, pas disparaître de la grille.
                      height: `${Math.max(valeur === 0 ? 0 : 2, (valeur / max) * 100)}%`,
                      minHeight: valeur === 0 ? 0 : 2,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 mt-2">
          {semaines.map((semaine, i) => (
            <div key={semaine} className="flex-1 text-center text-[10px] text-warm-grey">
              {/* Une semaine sur trois : douze dates alignées se chevauchent. */}
              {i % 3 === 0 ? semaine : ""}
            </div>
          ))}
        </div>
      </div>

      {/* Les barres portent leur valeur en infobulle ; ce tableau la porte pour
          qui n'a pas de souris.
          Le `sr-only` est sur l'enveloppe et non sur la table : l'`overflow` ne
          rogne pas la légende d'un tableau, qui ressortait alors sous le
          graphique. */}
      <div className="sr-only">
        <table>
          <caption>Activité hebdomadaire des douze dernières semaines</caption>
          <thead>
            <tr>
              <th>Semaine</th>
              {series.map((s) => (
                <th key={s.label}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semaines.map((semaine, i) => (
              <tr key={semaine}>
                <th scope="row">{semaine}</th>
                {series.map((s) => (
                  <td key={s.label}>{s.values[i] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}
