"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { RDV_STATUT_STYLES, type RdvStatut } from "./constants";
import { libelleType, type EtapeState } from "@/lib/parcours";
import { titreRendezVous, dureeRendezVous, libelleDuree } from "@/lib/rendez-vous";

export interface RdvQuestionnaire {
  besoins: string[];
  besoinAutre: string | null;
  patrimoine: string | null;
  investissement: string | null;
  ville: string | null;
  source: string | null;
  message: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Ce que la plateforme sait du rendez-vous et qu'un agenda ne saura jamais :
 * où en est le parcours, et si la fiche d'audit du R0 est déjà ouverte.
 *
 * Facultatif : la liste des rendez-vous ne le charge pas, la vue semaine si.
 */
export interface RdvContexte {
  clientId: string;
  /** Les trois jalons et leur état, dans l'ordre du parcours. */
  parcours: { type: string; etat: EtapeState }[];
  /** L'id de la fiche d'audit rattachée à ce rendez-vous, si elle existe. */
  ficheAuditId: string | null;
  /** Le conseiller connecté pilote-t-il ce dossier ? Sinon, aucun lien. */
  accessible: boolean;
}

export interface RdvDetailData {
  id: string;
  /** Déjà formatée côté serveur, dans le fuseau du cabinet. */
  heure: string;
  type: string;
  mode: string | null;
  meetingUrl: string | null;
  nom: string;
  email: string | null;
  phone: string | null;
  sansCompte: boolean;
  advisorName: string;
  status: string;
  /** Le questionnaire rattaché, ou null quand le rendez-vous a été pris sans. */
  demande: RdvQuestionnaire | null;
  contexte?: RdvContexte | null;
}

export const MODE_LABEL: Record<string, string> = {
  presentiel: "Au cabinet",
  visio: "Visio",
};

const ETAT_PASTILLE: Record<EtapeState, string> = {
  fait: "bg-emerald-500",
  encours: "bg-bronze",
  avenir: "bg-cream-deep",
};

const ETAT_TEXTE: Record<EtapeState, string> = {
  fait: "text-ink",
  encours: "text-bronze-dark font-medium",
  avenir: "text-warm-grey",
};

/** Une paire libellé / valeur, affichée seulement si la valeur existe. */
function Champ({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-warm-grey mb-1">
        {label}
      </div>
      <div className="text-[13.5px] text-charcoal leading-[1.6]">{value}</div>
    </div>
  );
}

/**
 * La fenêtre de détail d'un rendez-vous, partagée par la liste et le calendrier.
 *
 * Une seule fenêtre pour les deux vues : c'est la même réalité regardée de deux
 * façons, et deux copies finiraient par ne plus montrer les mêmes champs.
 */
export function RdvDetailModal({
  data,
  onClose,
}: {
  data: RdvDetailData;
  onClose: () => void;
}) {
  // Échap ferme, et le défilement du fond est gelé tant que la fenêtre est là.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const style = RDV_STATUT_STYLES[data.status as RdvStatut] ?? RDV_STATUT_STYLES.planifie;
  const demande = data.demande;
  const ctx = data.contexte ?? null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Rendez-vous de ${data.nom || "visiteur"}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto bg-cream sm:rounded-2xl rounded-t-2xl border border-cream-deep shadow-xl"
      >
        {/* En-tête : qui, et le récapitulatif du rendez-vous. */}
        <div className="sticky top-0 bg-cream border-b border-cream-deep px-6 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-[18px] font-semibold text-ink truncate">
                {data.nom || "Visiteur sans compte"}
              </h2>
              {data.sansCompte && (
                <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.6px] text-bronze-dark bg-bronze/12 px-1.5 py-0.5 rounded shrink-0">
                  Visiteur
                </span>
              )}
            </div>
            {/* L'intitulé exact du rendez-vous - celui de l'agenda du cabinet et
                des emails. Sans le nom du client : il est déjà au-dessus. */}
            <div className="text-[12.5px] text-charcoal mt-1 truncate">
              {titreRendezVous(data.type)}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[12px] text-warm-grey">
              <span>{data.heure}</span>
              <span aria-hidden="true">·</span>
              <span>{libelleDuree(dureeRendezVous(data.type))}</span>
              <span aria-hidden="true">·</span>
              <span>{MODE_LABEL[data.mode ?? ""] ?? "Au cabinet"}</span>
              {data.advisorName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{data.advisorName}</span>
                </>
              )}
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold ${style.pill}`}
              >
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 -mr-1.5 -mt-1 grid place-items-center w-8 h-8 rounded-lg text-warm-grey hover:text-ink hover:bg-cream-deep transition-colors cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Le lien de visio en premier : c'est le geste de l'heure qui vient. */}
          {data.mode === "visio" && data.meetingUrl && (
            <a
              href={data.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-bronze-dark hover:text-bronze transition-colors"
            >
              Rejoindre la visio
              <span aria-hidden="true">→</span>
            </a>
          )}

          {/* Contexte plateforme : où en est le dossier, et par où y entrer. */}
          {ctx && (
            <div>
              <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-warm-grey mb-2">
                Parcours
              </div>
              <ol className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {ctx.parcours.map((e) => (
                  <li key={e.type} className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={`w-1.5 h-1.5 rounded-full ${ETAT_PASTILLE[e.etat]}`}
                    />
                    <span className={`text-[12.5px] ${ETAT_TEXTE[e.etat]}`}>
                      {e.type} - {libelleType(e.type)}
                    </span>
                  </li>
                ))}
              </ol>

              {ctx.accessible ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                  <Link
                    href={`/admin/clients/${ctx.clientId}/suivi`}
                    className="text-[13px] font-medium text-bronze-dark hover:text-bronze transition-colors"
                  >
                    Ouvrir le dossier →
                  </Link>
                  {ctx.ficheAuditId && (
                    <Link
                      href={`/admin/clients/${ctx.clientId}/audits/${ctx.ficheAuditId}`}
                      className="text-[13px] font-medium text-bronze-dark hover:text-bronze transition-colors"
                    >
                      Fiche d&apos;audit →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-warm-grey mt-3">
                  Ce dossier est piloté par son conseiller référent.
                </p>
              )}
            </div>
          )}

          {/* Coordonnées du compte, quand le rendez-vous en a un. */}
          {!data.sansCompte && (data.email || data.phone) && (
            <div>
              <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-warm-grey mb-1.5">
                Contact
              </div>
              <div className="flex flex-col gap-1">
                {data.email && (
                  <a
                    href={`mailto:${data.email}`}
                    className="text-[13px] text-bronze-dark hover:text-bronze transition-colors"
                  >
                    {data.email}
                  </a>
                )}
                {data.phone && (
                  <a
                    href={`tel:${data.phone}`}
                    className="text-[13px] text-warm-grey hover:text-bronze transition-colors tabular-nums"
                  >
                    {data.phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Les réponses du questionnaire, quand il y en a un. */}
          {demande ? (
            <>
              {demande.besoins.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-warm-grey mb-2">
                    Besoins
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {demande.besoins.map((b) => (
                      <span
                        key={b}
                        className="inline-block text-[12.5px] text-charcoal bg-white border border-cream-deep px-2.5 py-1 rounded-md"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {demande.besoinAutre && <Champ label="Autre besoin" value={demande.besoinAutre} />}

              {(demande.patrimoine || demande.investissement) && (
                <div className="grid grid-cols-2 gap-4">
                  <Champ label="Patrimoine" value={demande.patrimoine} />
                  <Champ label="À investir" value={demande.investissement} />
                </div>
              )}

              {(demande.ville || demande.source) && (
                <div className="grid grid-cols-2 gap-4">
                  <Champ label="Ville" value={demande.ville} />
                  <Champ label="Nous a connus par" value={demande.source} />
                </div>
              )}

              {demande.message && <Champ label="Message" value={demande.message} />}

              {(demande.email || demande.phone) && (
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-warm-grey mb-1.5">
                    Contact du questionnaire
                  </div>
                  <div className="flex flex-col gap-1">
                    {demande.email && (
                      <a
                        href={`mailto:${demande.email}`}
                        className="text-[13px] text-bronze-dark hover:text-bronze transition-colors"
                      >
                        {demande.email}
                      </a>
                    )}
                    {demande.phone && (
                      <a
                        href={`tel:${demande.phone}`}
                        className="text-[13px] text-warm-grey hover:text-bronze transition-colors tabular-nums"
                      >
                        {demande.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-[12.5px] text-warm-grey">
              Aucun questionnaire rattaché à ce rendez-vous.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
