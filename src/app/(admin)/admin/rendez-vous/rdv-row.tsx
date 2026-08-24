"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Td } from "@/components/admin/ui";
import { RDV_STATUT_STYLES, type RdvStatut } from "./constants";

export interface RdvQuestionnaire {
  besoins: string[];
  besoinAutre: string | null;
  patrimoine: string | null;
  investissement: string | null;
  message: string | null;
  email: string | null;
  phone: string | null;
}

export interface RdvRowData {
  id: string;
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
}

const MODE_LABEL: Record<string, string> = {
  presentiel: "Au cabinet",
  visio: "Visio",
};

/**
 * Une ligne du tableau des rendez-vous. Quand un questionnaire est rattaché, la
 * ligne devient cliquable et ouvre une fenêtre avec toutes les réponses - le
 * détail ne charge plus le tableau, il attend qu'on le demande.
 */
export function RdvRow({ data }: { data: RdvRowData }) {
  const [open, setOpen] = useState(false);
  const style = RDV_STATUT_STYLES[data.status as RdvStatut] ?? RDV_STATUT_STYLES.planifie;
  const hasQ = data.demande !== null;

  return (
    <>
      <tr
        className={`align-top transition-colors ${
          hasQ ? "cursor-pointer hover:bg-cream/60" : "hover:bg-cream/40"
        }`}
        onClick={hasQ ? () => setOpen(true) : undefined}
      >
        {/* Rendez-vous : quand, quel type, quel format. */}
        <Td className="whitespace-nowrap">
          <div className="font-medium text-ink">{data.heure}</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-block text-[11px] font-semibold text-charcoal bg-cream border border-cream-deep px-1.5 py-0.5 rounded">
              {data.type}
            </span>
            {data.mode === "visio" ? (
              data.meetingUrl ? (
                <a
                  href={data.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[12px] text-bronze-dark hover:text-bronze transition-colors"
                >
                  Visio - rejoindre
                </a>
              ) : (
                <span className="text-[12px] text-warm-grey">Visio - lien à envoyer</span>
              )
            ) : (
              <span className="text-[12px] text-charcoal">Au cabinet</span>
            )}
          </div>
        </Td>

        {/* Client : compte rattaché, ou coordonnées du questionnaire. */}
        <Td>
          {data.nom ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-ink font-medium">{data.nom}</span>
                {data.sansCompte && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.6px] text-bronze-dark bg-bronze/12 px-1.5 py-0.5 rounded">
                    Visiteur
                  </span>
                )}
              </div>
              {data.email && (
                <a
                  href={`mailto:${data.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block text-[12px] text-bronze-dark hover:text-bronze transition-colors truncate max-w-[220px]"
                >
                  {data.email}
                </a>
              )}
              {data.phone && (
                <a
                  href={`tel:${data.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block text-[12px] text-warm-grey hover:text-bronze transition-colors tabular-nums"
                >
                  {data.phone}
                </a>
              )}
            </>
          ) : (
            <span className="text-[12px] text-warm-grey italic">Visiteur sans compte</span>
          )}
        </Td>

        {/* Questionnaire : un déclencheur, pas un mur d'information. */}
        <Td>
          {hasQ ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-bronze-dark hover:text-bronze transition-colors cursor-pointer"
            >
              Voir les réponses
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <span className="text-warm-grey">-</span>
          )}
        </Td>

        <Td className="whitespace-nowrap">
          {data.advisorName || <span className="text-warm-grey">-</span>}
        </Td>

        <Td>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${style.pill}`}
          >
            <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        </Td>
      </tr>

      {open && data.demande && (
        <QuestionnaireModal data={data} demande={data.demande} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

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

function QuestionnaireModal({
  data,
  demande,
  onClose,
}: {
  data: RdvRowData;
  demande: RdvQuestionnaire;
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Questionnaire de ${data.nom || "visiteur"}`}
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[12px] text-warm-grey">
              <span>{data.heure}</span>
              <span aria-hidden="true">·</span>
              <span>{data.type}</span>
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
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Corps : les réponses du questionnaire. */}
        <div className="px-6 py-5 space-y-5">
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

          {demande.message && <Champ label="Message" value={demande.message} />}

          {(demande.email || demande.phone) && (
            <div>
              <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-warm-grey mb-1.5">
                Contact
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
        </div>
      </div>
    </div>,
    document.body
  );
}
