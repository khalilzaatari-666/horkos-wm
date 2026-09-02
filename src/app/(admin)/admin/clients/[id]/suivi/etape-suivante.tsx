"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import type { ActionState } from "@/lib/staff";
import { planifierEtape } from "./actions";

const initialState: ActionState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

export interface EtapeSuivante {
  type: string;
  title: string;
}

/**
 * Pose l'étape suivante du parcours.
 *
 * Le bouton n'apparaît que si le serveur a jugé l'étape franchissable ; le même
 * calcul est refait à la soumission, l'affichage n'étant qu'une commodité.
 */
export function EtapeSuivanteButton({
  clientId,
  etape,
  cloture,
}: {
  clientId: string;
  etape: EtapeSuivante;
  /**
   * Étape à clore d'un même geste : le rendez-vous précédent, passé et pas
   * encore marqué. Convenir de la suite est ce qui atteste qu'il a eu lieu.
   */
  cloture?: { id: string; type: string };
}) {
  const [open, setOpen] = useState(false);

  const libelle = cloture
    ? `${cloture.type} effectué - planifier le ${etape.type}`
    : `Planifier le ${etape.type}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 inline-flex items-center text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors cursor-pointer"
      >
        {libelle}
      </button>
      {open && (
        <AdminModal title={`${libelle} - ${etape.title}`} onClose={() => setOpen(false)}>
          <EtapeForm
            clientId={clientId}
            etape={etape}
            cloture={cloture}
            onClose={() => setOpen(false)}
          />
        </AdminModal>
      )}
    </>
  );
}

function EtapeForm({
  clientId,
  etape,
  cloture,
  onClose,
}: {
  clientId: string;
  etape: EtapeSuivante;
  cloture?: { id: string; type: string };
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(planifierEtape, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="type" value={etape.type} />
      {cloture && <input type="hidden" name="terminerId" value={cloture.id} />}

      {cloture && (
        <p className="text-[12.5px] text-charcoal leading-[1.6] bg-cream border border-cream-deep rounded-lg p-3">
          En enregistrant, le {cloture.type} est marqué <strong>terminé</strong> et le{" "}
          {etape.type} est planifié.
        </p>
      )}

      <div>
        <label htmlFor="quand" className="block text-[12px] font-medium text-ink mb-1.5">
          Date et heure
        </label>
        <input id="quand" name="quand" type="datetime-local" required className={field} />
        <p className="text-[11.5px] text-warm-grey mt-1.5">
          Heure du cabinet (Casablanca). Le rendez-vous est enregistré comme planifié : ni
          invitation d&apos;agenda ni email ne part d&apos;ici.
        </p>
      </div>

      <div>
        <label htmlFor="mode" className="block text-[12px] font-medium text-ink mb-1.5">
          Format
        </label>
        <select id="mode" name="mode" defaultValue="presentiel" className={`${field} cursor-pointer`}>
          <option value="presentiel">Au cabinet</option>
          <option value="visio">En visioconférence</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-[12px] font-medium text-ink mb-1.5">
          Note (visible par le client)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors resize-none"
        />
      </div>

      {state.status === "error" && state.message && (
        <p className="text-[12.5px] text-red-600" aria-live="polite">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-5 text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {pending ? "Enregistrement…" : "Planifier"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-4 inline-flex items-center text-[13px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
