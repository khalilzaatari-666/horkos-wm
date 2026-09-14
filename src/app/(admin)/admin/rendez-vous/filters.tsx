"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  PERIODES,
  PERIODE_LABELS,
  RDV_STATUTS,
  RDV_STATUT_STYLES,
  RDV_TYPES,
  RDV_TYPE_LABELS,
  MODES,
  MODE_LABELS,
  DEFAULTS,
} from "./constants";

export interface ConseillerOption {
  id: string;
  name: string;
}

/** Partagé avec la barre de filtres de la vue semaine. */
export const CLASSE_SELECT =
  "h-9 px-3 pr-8 text-[12.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors cursor-pointer appearance-none";

/**
 * Filtres portés par l'URL plutôt que par un état local : la vue devient
 * partageable et survit à un rechargement - un conseiller peut envoyer « les
 * visios non confirmées de Untel » à un collègue par simple lien.
 *
 * `replace` et non `push` : filtrer n'est pas naviguer, et empiler chaque
 * réglage dans l'historique rendrait le bouton Retour inutilisable.
 */
export function RendezVousFilters({
  conseillers,
  total,
}: {
  conseillers: ConseillerOption[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "tous") next.delete(key);
    else next.set(key, value);
    // Le tri ne se réinitialise pas : on filtre souvent sans vouloir reperdre
    // l'ordre qu'on vient de choisir.
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  };

  const current = (key: string, fallback = "tous") => params.get(key) ?? fallback;
  const actifs = ["periode", "type", "statut", "mode", "conseiller"].filter((k) => params.get(k));

  return (
    <div className={`flex flex-wrap items-center gap-2.5 mb-5 ${pending ? "opacity-60" : ""}`}>
      <Wrapper>
        <select
          aria-label="Période"
          className={CLASSE_SELECT}
          value={current("periode", DEFAULTS.periode)}
          onChange={(e) => set("periode", e.target.value)}
        >
          {PERIODES.map((p) => (
            <option key={p} value={p}>
              {PERIODE_LABELS[p]}
            </option>
          ))}
        </select>
      </Wrapper>

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
            value={current("conseiller")}
            onChange={(e) => set("conseiller", e.target.value)}
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
        {total} rendez-vous
      </span>

      {actifs.length > 0 && (
        <button
          type="button"
          onClick={() => startTransition(() => router.replace(pathname))}
          className="text-[12.5px] text-bronze-dark hover:text-bronze transition-colors cursor-pointer"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}

/** Le chevron du système disparaît avec `appearance-none` : on le redessine. */
export function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative inline-flex items-center">
      {children}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="absolute right-2.5 w-3.5 h-3.5 pointer-events-none text-warm-grey"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
