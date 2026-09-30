"use client";

import { useActionState } from "react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import type { ActionState } from "@/lib/staff";
import { setAppointmentStatus } from "./actions";
import { DeplacerButton } from "./etape-suivante";

const initialState: ActionState = { status: "idle" };

interface Commande {
  /** Le statut que la commande pose. */
  vers: string;
  libelle: string;
  /** Demande confirmation avant d'envoyer : les gestes qui retirent le rendez-vous. */
  confirmer?: string;
}

const ANNULER: Commande = {
  vers: "annule",
  libelle: "Annuler",
  confirmer:
    "Annuler ce rendez-vous ? S'il est à venir, le client est prévenu par email et l'invitation quitte les agendas.",
};

/**
 * Ce qui est proposé dépend de l'état : on ne « termine » pas un rendez-vous
 * annulé, on ne « rétablit » que ce qui a été annulé. Un rendez-vous terminé ou
 * non honoré garde une porte de sortie - « Rouvrir » - parce qu'un clic de trop
 * ne doit pas figer le parcours du client.
 */
function commandesPour(status: string): Commande[] {
  if (status === "annule") return [{ vers: "confirme", libelle: "Rétablir" }];
  if (status === "non_honore") return [{ vers: "confirme", libelle: "Rouvrir" }];
  if (status === "termine") return [{ vers: "confirme", libelle: "Rouvrir" }, ANNULER];
  return [
    { vers: "termine", libelle: "Marquer terminé" },
    { vers: "non_honore", libelle: "Absent" },
    ANNULER,
  ];
}

/**
 * Les commandes d'une ligne du suivi.
 *
 * `refus` vient de `refusChangement`, calculé par la page pour chaque statut
 * cible : une commande refusée est grisée avec sa raison, plutôt que de laisser
 * un clic sans effet. Le serveur refait le même contrôle, et sa réponse
 * s'affiche sous la ligne si l'état a changé entre-temps.
 */
export function RdvActions({
  clientId,
  id,
  type,
  status,
  refus,
}: {
  clientId: string;
  id: string;
  type: string;
  status: string;
  refus: Record<string, string | null>;
}) {
  const [state, formAction, pending] = useActionState(setAppointmentStatus, initialState);

  const lien = "text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer";
  const inactif = "text-[12.5px] text-warm-grey/50 cursor-not-allowed";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3 justify-end whitespace-nowrap">
        {(status === "planifie" || status === "confirme") && (
          <DeplacerButton clientId={clientId} id={id} type={type} />
        )}
        {commandesPour(status).map((c) => {
          const raison = refus[c.vers] ?? null;
          if (raison) {
            return (
              <button
                key={c.vers}
                type="button"
                disabled
                title={raison}
                aria-label={`${c.libelle} : ${raison}`}
                className={inactif}
              >
                {c.libelle}
              </button>
            );
          }
          return (
            <form key={c.vers} action={formAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="status" value={c.vers} />
              {c.confirmer ? (
                <ConfirmButton
                  message={c.confirmer}
                  className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
                >
                  {c.libelle}
                </ConfirmButton>
              ) : (
                <button type="submit" disabled={pending} className={lien}>
                  {c.libelle}
                </button>
              )}
            </form>
          );
        })}
      </div>
      {state.status === "error" && state.message && (
        <p className="text-[11.5px] text-red-600 max-w-[260px] text-right" aria-live="polite">
          {state.message}
        </p>
      )}
    </div>
  );
}
