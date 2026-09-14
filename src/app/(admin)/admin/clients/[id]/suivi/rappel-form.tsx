"use client";

import { useActionState, useState } from "react";
import { UNITES, QUANTITE_MAX, echeance, libelleDelai, type Unite } from "@/lib/rappels";
import type { ActionState } from "@/lib/staff";
import { poserRappel } from "./actions";

const initialState: ActionState = { status: "idle" };

const UNITE_OPTIONS: Record<Unite, string> = {
  heures: "heures",
  jours: "jours",
  mois: "mois",
};

/** Même fuseau que partout ailleurs : le conseiller lit l'heure du cabinet. */
const apercuFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Casablanca",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Pose un rappel de relance après le R0.
 *
 * Le conseiller saisit un délai, pas une date : c'est ainsi qu'il y pense en
 * sortant du rendez-vous. L'échéance calculée s'affiche quand même en clair
 * avant validation - « dans 3 mois » ne dit pas grand-chose, « le mardi 8
 * décembre » si.
 *
 * Cet aperçu n'est qu'un aperçu : l'échéance réellement enregistrée est
 * recalculée par l'action serveur, à l'instant de l'écriture.
 */
export function RappelForm({
  clientId,
  appointmentId,
}: {
  clientId: string;
  appointmentId: string;
}) {
  const [state, formAction, pending] = useActionState(poserRappel, initialState);
  const [quantite, setQuantite] = useState(3);
  const [unite, setUnite] = useState<Unite>("jours");

  // `new Date()` à chaque rendu : l'aperçu n'a pas à être stable, il suit la
  // saisie. Rien ici n'est rendu côté serveur, donc aucun écart d'hydratation.
  const prevue = echeance(new Date(), quantite, unite);

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="appointmentId" value={appointmentId} />

      <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-warm-grey mb-1.5">
        Me rappeler de relancer dans
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          name="quantite"
          aria-label="Délai"
          min={1}
          max={QUANTITE_MAX[unite]}
          step={1}
          value={quantite}
          onChange={(e) => setQuantite(Number(e.target.value))}
          className="w-16 h-9 px-2 text-[13px] text-center tabular-nums bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors"
        />
        <select
          name="unite"
          aria-label="Unité"
          value={unite}
          onChange={(e) => setUnite(e.target.value as Unite)}
          className="h-9 px-2.5 text-[13px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors cursor-pointer"
        >
          {UNITES.map((u) => (
            <option key={u} value={u}>
              {UNITE_OPTIONS[u]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || !prevue}
          className="h-9 px-3.5 text-[12.5px] font-medium text-white bg-bronze rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {pending ? "…" : "Poser le rappel"}
        </button>
      </div>

      <input
        type="text"
        name="note"
        maxLength={500}
        placeholder="Note (facultative) - reprise dans l'email"
        className="w-full h-9 px-2.5 mt-2 text-[12.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors"
      />

      <p className="text-[11.5px] text-warm-grey leading-[1.5] mt-2">
        {prevue ? (
          <>
            Dans {libelleDelai(quantite, unite)}, soit le {apercuFmt.format(prevue)}. Un email part
            à l&apos;échéance, et la relance est ajoutée à l&apos;agenda du conseiller référent.
          </>
        ) : (
          <>Délai hors limites (1 à {QUANTITE_MAX[unite]} {unite}).</>
        )}
      </p>

      {state.status === "error" && state.message && (
        <p className="text-[12px] text-red-600 mt-1.5" aria-live="polite">
          {state.message}
        </p>
      )}
    </form>
  );
}
