"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import type { ActionState } from "@/lib/staff";
import {
  deplacerRendezVous,
  planifierEtape,
  verifierCreneau,
  type Disponibilite,
} from "./actions";

const initialState: ActionState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-ink/10 rounded-lg outline-none focus:border-bronze transition-colors";

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
        className="h-10 px-5 inline-flex items-center text-[14px] font-medium bg-ink text-white rounded-[6px] hover:bg-navy transition-colors cursor-pointer"
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
  passeInterdit = false,
}: {
  dispo: Disponibilite | null;
  enCours: boolean;
  montre: boolean;
  /** Un déplacement vers le passé est refusé, là où une étape peut se rattraper. */
  passeInterdit?: boolean;
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
          {dispo.soi ? "Votre agenda est libre" : `L'agenda de ${dispo.nom} est libre`} sur ce
          créneau ({dispo.duree}).
        </>
      ) : (
        <>
          <strong>
            {dispo.soi ? "Vous n'êtes pas disponible" : `${dispo.nom} n'est pas disponible`}
          </strong>{" "}
          sur ce créneau ({dispo.duree}) :
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
      {dispo.passe && (
        <p className={"mt-1 " + (libre ? "text-emerald-900" : "text-red-800")}>
          {passeInterdit
            ? "Cette heure est déjà passée : choisissez une heure à venir."
            : "Cette heure est déjà passée : le rendez-vous sera enregistré comme planifié, puis à clôturer."}
        </p>
      )}
    </div>
  );
}

/**
 * L'heure saisie et ce que l'agenda en dit. Demandé au serveur : lui seul voit
 * l'agenda, et lui seul sait quel conseiller prendra ce rendez-vous (le
 * référent du client, sinon un conseiller libre).
 */
function useDisponibilite(clientId: string, type: string, ignorer?: string) {
  const [quand, setQuandBrut] = useState("");
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
        setDispo(await verifierCreneau(clientId, type, quand, ignorer));
      });
    }, 400);
    return () => clearTimeout(minuteur);
  }, [quand, clientId, type, ignorer]);

  // L'heure qui a été envoyée : une erreur du serveur ne vaut que pour elle, et
  // s'efface dès qu'on en choisit une autre.
  const [soumis, setSoumis] = useState<string | null>(null);

  const setQuand = (valeur: string) => {
    setQuandBrut(valeur);
    setDispo(null);
  };

  return {
    quand,
    setQuand,
    dispo,
    verification,
    marquerSoumis: () => setSoumis(quand),
    erreurActuelle: soumis === quand,
  };
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
  const { quand, setQuand, dispo, verification, marquerSoumis, erreurActuelle } =
    useDisponibilite(clientId, etape.type);

  useEffect(() => {
    if (state.status === "success") {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  return (
    <form action={formAction} onSubmit={marquerSoumis} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="type" value={etape.type} />
      {cloture && <input type="hidden" name="terminerId" value={cloture.id} />}

      {cloture && (
        <p className="text-[12.5px] text-charcoal leading-[1.6] bg-cream-deep/40 border border-ink/10 rounded-lg p-3">
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
          onChange={(e) => setQuand(e.target.value)}
          className={field}
        />
        <p className="text-[11.5px] text-warm-grey mt-1.5">
          Heure du cabinet (Casablanca). Le client reçoit une invitation d&apos;agenda et un
          email de confirmation, le conseiller aussi.
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
          className="w-full px-3 py-2 text-[13.5px] bg-white border border-ink/10 rounded-lg outline-none focus:border-bronze transition-colors resize-none"
        />
      </div>

      {state.status === "error" && state.message && erreurActuelle && (
        <p className="text-[12.5px] text-red-600" aria-live="polite">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-5 text-[14px] font-medium bg-ink text-white rounded-[6px] hover:bg-navy disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

/**
 * Déplace un rendez-vous encore posé : la même ligne, à une autre heure. Le
 * client reçoit la nouvelle heure et une invitation à jour ; rien n'est compté
 * comme annulé.
 */
export function DeplacerButton({
  clientId,
  id,
  type,
}: {
  clientId: string;
  id: string;
  type: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
      >
        Déplacer
      </button>
      {open && (
        <AdminModal title="Déplacer le rendez-vous" onClose={() => setOpen(false)}>
          <DeplacerForm clientId={clientId} id={id} type={type} onClose={() => setOpen(false)} />
        </AdminModal>
      )}
    </>
  );
}

function DeplacerForm({
  clientId,
  id,
  type,
  onClose,
}: {
  clientId: string;
  id: string;
  type: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(deplacerRendezVous, initialState);
  const router = useRouter();
  const { quand, setQuand, dispo, verification, marquerSoumis, erreurActuelle } =
    useDisponibilite(clientId, type, id);

  useEffect(() => {
    if (state.status === "success") {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  return (
    <form action={formAction} onSubmit={marquerSoumis} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="clientId" value={clientId} />

      <div>
        <label htmlFor="deplacer-quand" className="block text-[12px] font-medium text-ink mb-1.5">
          Nouvelle date et heure
        </label>
        <input
          id="deplacer-quand"
          name="quand"
          type="datetime-local"
          required
          value={quand}
          onChange={(e) => setQuand(e.target.value)}
          className={field}
        />
        <p className="text-[11.5px] text-warm-grey mt-1.5">
          Heure du cabinet (Casablanca). Le client reçoit la nouvelle heure et une invitation
          à jour.
        </p>
        <Verdict dispo={dispo} enCours={verification} montre={Boolean(quand)} passeInterdit />
      </div>

      {state.status === "error" && state.message && erreurActuelle && (
        <p className="text-[12.5px] text-red-600" aria-live="polite">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-5 text-[14px] font-medium bg-ink text-white rounded-[6px] hover:bg-navy disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {pending ? "Enregistrement…" : "Déplacer"}
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
