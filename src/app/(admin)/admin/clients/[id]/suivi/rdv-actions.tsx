"use client";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { setAppointmentStatus } from "./actions";

/**
 * Les commandes d'une ligne du suivi.
 *
 * Ce qui est proposé dépend de l'état : on ne « termine » pas un rendez-vous
 * annulé, on ne « rétablit » que ce qui a été annulé. Un rendez-vous terminé
 * garde une porte de sortie - « Rouvrir » - parce qu'un clic de trop ne doit
 * pas figer le parcours du client.
 */
export function RdvActions({
  clientId,
  id,
  status,
}: {
  clientId: string;
  id: string;
  status: string;
}) {
  const champs = (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="clientId" value={clientId} />
    </>
  );

  const lien = "text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer";

  if (status === "annule") {
    return (
      <div className="flex items-center justify-end whitespace-nowrap">
        <form action={setAppointmentStatus}>
          {champs}
          <input type="hidden" name="status" value="confirme" />
          <button type="submit" className={lien}>
            Rétablir
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 justify-end whitespace-nowrap">
      <form action={setAppointmentStatus}>
        {champs}
        <input type="hidden" name="status" value={status === "termine" ? "confirme" : "termine"} />
        <button type="submit" className={lien}>
          {status === "termine" ? "Rouvrir" : "Marquer terminé"}
        </button>
      </form>

      <form action={setAppointmentStatus}>
        {champs}
        <input type="hidden" name="status" value="annule" />
        <ConfirmButton
          message="Annuler ce rendez-vous ? Le client ne le verra plus dans son espace."
          className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
        >
          Annuler
        </ConfirmButton>
      </form>
    </div>
  );
}
