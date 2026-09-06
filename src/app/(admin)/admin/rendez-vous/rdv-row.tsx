"use client";

import { useState } from "react";
import { Td } from "@/components/admin/ui";
import { RDV_STATUT_STYLES, type RdvStatut } from "./constants";
import { RdvDetailModal, type RdvDetailData } from "./rdv-detail";

export type { RdvQuestionnaire } from "./rdv-detail";

/** La liste et le calendrier montrent le même rendez-vous, donc la même forme. */
export type RdvRowData = RdvDetailData;

/**
 * Une ligne du tableau des rendez-vous. Quand un questionnaire est rattaché, la
 * ligne devient cliquable et ouvre la fenêtre de détail - le détail ne charge
 * plus le tableau, il attend qu'on le demande.
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

      {open && <RdvDetailModal data={data} onClose={() => setOpen(false)} />}
    </>
  );
}
