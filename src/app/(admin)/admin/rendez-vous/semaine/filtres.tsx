"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  RDV_STATUTS,
  RDV_STATUT_STYLES,
  RDV_TYPES,
  RDV_TYPE_LABELS,
  MODES,
  MODE_LABELS,
} from "../constants";
import { CLASSE_SELECT, Wrapper, type ConseillerOption } from "../filters";

/**
 * Les filtres de la vue semaine : les mêmes que ceux de la liste, moins la
 * période - la semaine affichée est la période, et un second réglage qui dirait
 * le contraire ne pourrait qu'induire en erreur.
 *
 * Le conseiller obéit à une règle à part. Un conseiller qui ouvre l'agenda veut
 * le sien, pas celui de tout le cabinet ; l'absence de paramètre vaut donc
 * « moi », et « tous » s'écrit explicitement dans l'URL. Le serveur applique la
 * même règle et renvoie ici la valeur retenue, pour que le menu montre toujours
 * ce qui est réellement affiché.
 */
export function FiltresSemaine({
  conseillers,
  valeurConseiller,
  total,
}: {
  conseillers: ConseillerOption[];
  valeurConseiller: string;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const naviguer = (next: URLSearchParams) => {
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  };

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "tous") next.delete(key);
    else next.set(key, value);
    naviguer(next);
  };

  // Le conseiller s'écrit toujours, « tous » compris : sans ça, choisir « tous »
  // reviendrait à effacer le paramètre, donc à retomber sur son propre agenda.
  const setConseiller = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("conseiller", value);
    naviguer(next);
  };

  const current = (key: string) => params.get(key) ?? "tous";
  // La semaine affichée ne se réinitialise pas avec les filtres : on remet les
  // critères à zéro sans être renvoyé à la semaine courante.
  const actifs = ["statut", "type", "mode", "conseiller"].filter((k) => params.get(k));

  return (
    <div className={`flex flex-wrap items-center gap-2.5 mb-5 ${pending ? "opacity-60" : ""}`}>
      <Wrapper>
        <select
          aria-label="Étape du parcours"
          className={CLASSE_SELECT}
          value={current("type")}
          onChange={(e) => set("type", e.target.value)}
        >
          <option value="tous">Toutes les étapes</option>
          {RDV_TYPES.map((t) => (
            <option key={t} value={t}>
              {RDV_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Wrapper>

      <Wrapper>
        <select
          aria-label="Statut"
          className={CLASSE_SELECT}
          value={current("statut")}
          onChange={(e) => set("statut", e.target.value)}
        >
          <option value="tous">Tous les statuts</option>
          {RDV_STATUTS.map((s) => (
            <option key={s} value={s}>
              {RDV_STATUT_STYLES[s].label}
            </option>
          ))}
        </select>
      </Wrapper>

      <Wrapper>
        <select
          aria-label="Format"
          className={CLASSE_SELECT}
          value={current("mode")}
          onChange={(e) => set("mode", e.target.value)}
        >
          <option value="tous">Tous les formats</option>
          {MODES.map((m) => (
            <option key={m} value={m}>
              {MODE_LABELS[m]}
            </option>
          ))}
        </select>
      </Wrapper>

      {conseillers.length > 0 && (
        <Wrapper>
          <select
            aria-label="Conseiller"
            className={CLASSE_SELECT}
            value={valeurConseiller}
            onChange={(e) => setConseiller(e.target.value)}
          >
            <option value="tous">Tous les conseillers</option>
            {conseillers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Wrapper>
      )}

      <span className="text-[12.5px] text-warm-grey ml-1 tabular-nums">
        {total} rendez-vous cette semaine
      </span>

      {actifs.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            for (const k of actifs) next.delete(k);
            naviguer(next);
          }}
          className="text-[12.5px] text-bronze-dark hover:text-bronze transition-colors cursor-pointer"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
