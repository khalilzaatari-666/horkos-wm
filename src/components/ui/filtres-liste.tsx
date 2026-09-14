"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * Barre de filtres générique des listes du back-office.
 *
 * Reprend le parti pris de la page Rendez-vous, dont elle généralise la barre :
 * les réglages vivent dans l'URL, pas dans un état local, pour qu'une vue se
 * partage par lien et survive au rechargement.
 *
 * `replace` et non `push` : filtrer n'est pas naviguer, et empiler chaque
 * réglage dans l'historique rendrait le bouton Retour inutilisable. Le tri, lui,
 * n'est jamais réinitialisé par un filtre - on affine souvent une liste sans
 * vouloir reperdre l'ordre qu'on vient de choisir.
 */

export interface OptionFiltre {
  value: string;
  label: string;
}

export interface ChampFiltre {
  /** Clé écrite dans l'URL. */
  cle: string;
  /** Intitulé lu par les lecteurs d'écran. */
  aria: string;
  /** Le choix « tout », en tête de liste. */
  toutes: string;
  options: OptionFiltre[];
}

export const CLASSE_SELECT =
  "h-9 px-3 pr-8 text-[12.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors cursor-pointer appearance-none";

const CLASSE_CHAMP =
  "h-9 px-3 text-[12.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

export function FiltresListe({
  champs = [],
  recherche,
  total,
  unite,
}: {
  champs?: ChampFiltre[];
  /** Champ de recherche libre, quand la liste est assez longue pour en avoir besoin. */
  recherche?: { cle?: string; placeholder: string };
  /** Nombre de lignes après filtrage, pour que l'écran dise ce qu'il montre. */
  total: number;
  /** « client » → « 3 clients ». Le pluriel est ajouté au-delà de un. */
  unite: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const cleRecherche = recherche?.cle ?? "q";

  const aller = (next: URLSearchParams) => {
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  };

  const set = (cle: string, valeur: string) => {
    const next = new URLSearchParams(params.toString());
    if (!valeur || valeur === "tous") next.delete(cle);
    else next.set(cle, valeur);
    aller(next);
  };

  const cles = [...champs.map((c) => c.cle), ...(recherche ? [cleRecherche] : [])];
  const actifs = cles.filter((c) => params.get(c));

  return (
    <div className={`flex flex-wrap items-center gap-2.5 mb-4 ${pending ? "opacity-60" : ""}`}>
      {recherche && (
        // Un formulaire à part : la recherche se valide à la frappe d'Entrée,
        // là où un `select` s'applique au changement. Recharger la page à
        // chaque lettre ferait clignoter la liste sous les doigts.
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const valeur = new FormData(e.currentTarget).get(cleRecherche);
            const next = new URLSearchParams(params.toString());
            const terme = typeof valeur === "string" ? valeur.trim() : "";
            if (terme) next.set(cleRecherche, terme);
            else next.delete(cleRecherche);
            aller(next);
          }}
        >
          <input
            type="search"
            name={cleRecherche}
            defaultValue={params.get(cleRecherche) ?? ""}
            placeholder={recherche.placeholder}
            aria-label={recherche.placeholder}
            className={`${CLASSE_CHAMP} w-[240px] max-w-full`}
          />
        </form>
      )}

      {champs.map((champ) => (
        <Wrapper key={champ.cle}>
          <select
            aria-label={champ.aria}
            className={CLASSE_SELECT}
            value={params.get(champ.cle) ?? "tous"}
            onChange={(e) => set(champ.cle, e.target.value)}
          >
            <option value="tous">{champ.toutes}</option>
            {champ.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Wrapper>
      ))}

      <span className="text-[12.5px] text-warm-grey ml-1 tabular-nums">
        {total} {unite}
        {total > 1 ? "s" : ""}
      </span>

      {actifs.length > 0 && (
        <button
          type="button"
          onClick={() => {
            // Le tri survit à la réinitialisation : ce bouton efface les
            // filtres, pas l'ordre de lecture choisi juste avant.
            const next = new URLSearchParams(params.toString());
            for (const cle of cles) next.delete(cle);
            aller(next);
          }}
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
