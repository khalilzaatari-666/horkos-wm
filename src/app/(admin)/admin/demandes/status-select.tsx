"use client";

import { useRef, useState, useTransition } from "react";
import { updateDemandeStatus } from "./actions";
import {
  DEMANDE_STATUTS,
  DEMANDE_STATUT_STYLES,
  type DemandeStatut,
} from "./constants";

/**
 * Statut sous forme de pastille colorée, modifiable en place.
 *
 * Le `select` natif est conservé — accessible au clavier et au lecteur d'écran
 * sans rien réécrire — mais dépouillé de son apparence système : ce sont les
 * couleurs du statut courant qui l'habillent, et une pastille rappelle la
 * couleur pour ne pas reposer sur elle seule.
 *
 * La soumission part au changement, sans bouton : c'est le geste le plus
 * fréquent du back-office, un clic de confirmation par ligne serait une taxe.
 */
export function StatusSelect({ id, value }: { id: string; value: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  // Optimiste : la couleur suit le choix sans attendre l'aller-retour serveur,
  // sinon la pastille reste sur l'ancien statut le temps du revalidate.
  const [current, setCurrent] = useState(value);

  const statut = (DEMANDE_STATUTS as readonly string[]).includes(current)
    ? (current as DemandeStatut)
    : "nouveau";
  const style = DEMANDE_STATUT_STYLES[statut];

  return (
    <form ref={formRef} action={updateDemandeStatus}>
      <input type="hidden" name="id" value={id} />
      <div
        className={`relative inline-flex items-center gap-2 pl-2.5 pr-7 py-1.5 rounded-full border transition-colors ${style.pill} ${
          pending ? "opacity-60" : ""
        }`}
      >
        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />

        <select
          name="status"
          value={current}
          disabled={pending}
          aria-label={`Statut : ${style.label}`}
          title={style.hint}
          onChange={(e) => {
            setCurrent(e.target.value);
            startTransition(() => formRef.current?.requestSubmit());
          }}
          className="appearance-none bg-transparent border-0 outline-none text-[12px] font-semibold tracking-[0.3px] cursor-pointer pr-0 focus-visible:underline disabled:cursor-wait"
        >
          {DEMANDE_STATUTS.map((s) => (
            <option key={s} value={s} className="bg-white text-charcoal font-normal">
              {DEMANDE_STATUT_STYLES[s].label}
            </option>
          ))}
        </select>

        {/* Chevron dessiné : `appearance-none` a retiré celui du système. */}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="absolute right-2.5 w-3 h-3 pointer-events-none opacity-60"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </form>
  );
}
