"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import type { ActionState } from "@/lib/staff";
import { planifierEtape, verifierCreneau, type Disponibilite } from "./actions";

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

/**
 * Ce que l'agenda répond sur l'heure choisie.
 *
 * Un avis, pas un verrou : le bouton reste actif même en cas de conflit. Il
 * arrive qu'un conseiller pose sciemment deux rendez-vous de front, ou qu'il
 * sache que l'un des deux va sauter ; l'écran le prévient, il décide.
 */
function Verdict({
  dispo,
  enCours,
  montre,
}: {
  dispo: Disponibilite | null;
  enCours: boolean;
  montre: boolean;
}) {
  if (!montre) return null;

  if (enCours || !dispo) {
    return <p className="text-[12px] text-warm-grey mt-2">Vérification de l&apos;agenda…</p>;
  }
  if (dispo.etat === "inconnu") {
    return <p className="text-[12px] text-warm-grey mt-2">Agenda non vérifiable pour cette date.</p>;
  }

  const libre = dispo.etat === "libre";
  const cadre = libre
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      aria-live="polite"
      className={"mt-2 p-2.5 rounded-lg border text-[12.5px] leading-[1.6] " + cadre}
    >
      {libre ? (
        <>
          Votre agenda est libre sur ce créneau ({dispo.duree}).
        </>
      ) : (
        <>
          <strong>Vous n&apos;êtes pas disponible</strong> sur ce créneau ({dispo.duree}) :
          <ul className="mt-1 space-y-0.5">
            {dispo.conflits.map((c, i) => (
              <li key={i}>
                {c.creneau} - {c.intitule}
                {c.client ? ` - ${c.client}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      {dispo.horsHoraires && (
        <p className={"mt-1 " + (libre ? "text-emerald-900" : "text-red-800")}>
          Hors des horaires du cabinet (9 h - 12 h 30, 14 h - 18 h, du lundi au vendredi).
        </p>
      )}
    </div>
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

  // Disponibilité du conseiller sur l'heure choisie. Demandée au serveur : lui
  // seul voit l'agenda, et lui seul sait quel conseiller prendra ce rendez-vous
  // (le référent du client, ou celui qui pose l'étape).
  const [quand, setQuand] = useState("");
  const [dispo, setDispo] = useState<Disponibilite | null>(null);
  const [verification, demarrerVerification] = useTransition();

  useEffect(() => {
    // L'effet ne fait que demander : c'est la saisie qui efface le verdict
    // précédent, pour qu'aucun état ne soit posé depuis un effet.
    if (!quand) return;
    // Un champ `datetime-local` émet un changement à chaque chiffre tapé : sans
    // ce délai, saisir « 14:30 » déclencherait quatre allers-retours.
    const minuteur = setTimeout(() => {
      demarrerVerification(async () => {
        setDispo(await verifierCreneau(clientId, etape.type, quand));
      });
    }, 400);
    return () => clearTimeout(minuteur);
  }, [quand, clientId, etape.type]);

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
        <input
          id="quand"
          name="quand"
          type="datetime-local"
          required
          value={quand}
          onChange={(e) => {
            setQuand(e.target.value);
            setDispo(null);
          }}
          className={field}
        />
        <p className="text-[11.5px] text-warm-grey mt-1.5">
          Heure du cabinet (Casablanca). Le rendez-vous est enregistré comme planifié : ni
          invitation d&apos;agenda ni email ne part d&apos;ici.
        </p>

        <Verdict dispo={dispo} enCours={verification} montre={Boolean(quand)} />
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
