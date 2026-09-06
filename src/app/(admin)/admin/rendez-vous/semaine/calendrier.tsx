"use client";

import { useMemo, useState } from "react";
import {
  OUVERTURE,
  FERMETURE,
  DEJEUNER_DEBUT,
  DEJEUNER_FIN,
  formatMinutes,
} from "@/components/booking/grille";
import { RDV_STATUT_STYLES, type RdvStatut } from "../constants";
import { RdvDetailModal, type RdvDetailData } from "../rdv-detail";
import { disposer } from "./disposition";

/** Un pas de grille : la demi-heure de la grille de réservation. */
const PAS = 30;
/** Hauteur d'un pas, en pixels. Une heure occupe donc 76 px. */
const HAUTEUR_PAS = 38;

export interface JourSemaine {
  /** « 2026-09-07 », clé de rendu et rien d'autre. */
  cle: string;
  /** « Lun. 7 sept. », calculé côté serveur dans le fuseau du cabinet. */
  label: string;
  aujourdhui: boolean;
}

export interface BlocSemaine {
  /** 0 = lundi, 6 = dimanche. */
  rang: number;
  /** Minutes depuis minuit, à l'heure du cabinet. */
  debut: number;
  fin: number;
  /** « 09:00 » */
  heureCourte: string;
  detail: RdvDetailData;
}

/** Arrondit au pas inférieur / supérieur. */
const planche = (m: number) => Math.floor(m / PAS) * PAS;
const plafond = (m: number) => Math.ceil(m / PAS) * PAS;

/**
 * La semaine du cabinet, colonne par jour et demi-heure par demi-heure.
 *
 * Les bornes horaires ne sont pas figées : la grille s'ouvre sur les heures du
 * cabinet, mais un rendez-vous posé à la main hors de ces heures l'étire plutôt
 * que d'être relégué dans une liste à part - un rendez-vous affiché ailleurs
 * que dans l'agenda est un rendez-vous qu'on rate.
 *
 * Aucun placement ne se fait par créneau : chaque bloc est positionné au prorata
 * de ses minutes, ce qui reste juste pour un rendez-vous à 9h20.
 */
export function Calendrier({ jours, blocs }: { jours: JourSemaine[]; blocs: BlocSemaine[] }) {
  const [ouvert, setOuvert] = useState<string | null>(null);

  const debutGrille = Math.min(OUVERTURE, ...blocs.map((b) => planche(b.debut)));
  const finGrille = Math.max(FERMETURE, ...blocs.map((b) => plafond(b.fin)));
  const nbPas = Math.max(1, (finGrille - debutGrille) / PAS);
  const hauteur = nbPas * HAUTEUR_PAS;

  /** Ordonnée d'une minute dans la grille. */
  const y = (minutes: number) => ((minutes - debutGrille) / PAS) * HAUTEUR_PAS;

  // Les chevauchements se résolvent jour par jour : deux rendez-vous de jours
  // différents ne se disputent aucune largeur.
  const places = useMemo(() => {
    const parJour = new Map<number, number[]>();
    blocs.forEach((b, i) => {
      const liste = parJour.get(b.rang);
      if (liste) liste.push(i);
      else parJour.set(b.rang, [i]);
    });

    const resultat = blocs.map(() => ({ colonne: 0, total: 1 }));
    for (const index of parJour.values()) {
      const calcul = disposer(index.map((i) => ({ debut: blocs[i].debut, fin: blocs[i].fin })));
      index.forEach((i, k) => {
        resultat[i] = calcul[k];
      });
    }
    return resultat;
  }, [blocs]);

  // Une étiquette par heure pleine comprise dans la grille.
  const heures: number[] = [];
  for (let m = Math.ceil(debutGrille / 60) * 60; m <= finGrille; m += 60) heures.push(m);

  const dejeunerVisible = DEJEUNER_FIN > debutGrille && DEJEUNER_DEBUT < finGrille;
  const detailOuvert = blocs.find((b) => b.detail.id === ouvert)?.detail ?? null;

  return (
    <>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[760px]">
          {/* En-têtes de colonnes */}
          <div
            className="grid gap-px mb-1"
            style={{ gridTemplateColumns: `52px repeat(${jours.length}, minmax(0, 1fr))` }}
          >
            <div aria-hidden="true" />
            {jours.map((j) => (
              <div
                key={j.cle}
                className={`text-center text-[12px] font-medium py-1.5 rounded-md ${
                  j.aujourdhui ? "bg-bronze/12 text-bronze-dark" : "text-charcoal"
                }`}
              >
                {j.label}
              </div>
            ))}
          </div>

          {/* Corps : une piste par jour, les blocs placés au prorata. */}
          <div
            className="grid gap-px bg-cream-deep border border-cream-deep rounded-lg overflow-hidden"
            style={{ gridTemplateColumns: `52px repeat(${jours.length}, minmax(0, 1fr))` }}
          >
            {/* Colonne des heures */}
            <div className="relative bg-cream" style={{ height: hauteur }}>
              {heures.map((m) => {
                const haut = y(m);
                // Les étiquettes sont centrées sur leur trait, sauf la première
                // et la dernière : le cadre a les coins arrondis, donc il rogne,
                // et une étiquette à cheval sur son bord serait coupée en deux.
                // On les ancre par le bord qui touche.
                const ancrage =
                  haut <= 0
                    ? "translate-y-0"
                    : haut >= hauteur
                      ? "-translate-y-full"
                      : "-translate-y-1/2";
                return (
                  <div
                    key={m}
                    className={`absolute right-2 ${ancrage} text-[11px] tabular-nums text-warm-grey`}
                    style={{ top: haut }}
                  >
                    {formatMinutes(m)}
                  </div>
                );
              })}
            </div>

            {jours.map((j, rang) => (
              <div key={j.cle} className="relative bg-white" style={{ height: hauteur }}>
                {/* Repères horaires : trait plein à l'heure, discret à la demie. */}
                {Array.from({ length: nbPas }, (_, i) => {
                  const m = debutGrille + i * PAS;
                  return (
                    <div
                      key={m}
                      className={`absolute inset-x-0 border-t ${
                        m % 60 === 0 ? "border-cream-deep" : "border-cream"
                      }`}
                      style={{ top: y(m) }}
                    />
                  );
                })}

                {/* La pause déjeuner du cabinet, pour que le vide s'explique. */}
                {dejeunerVisible && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bg-cream/70"
                    style={{
                      top: y(Math.max(DEJEUNER_DEBUT, debutGrille)),
                      height:
                        y(Math.min(DEJEUNER_FIN, finGrille)) -
                        y(Math.max(DEJEUNER_DEBUT, debutGrille)),
                    }}
                  />
                )}

                {j.aujourdhui && (
                  <div aria-hidden="true" className="absolute inset-0 bg-bronze/[0.05]" />
                )}

                {blocs.map((b, i) => {
                  if (b.rang !== rang) return null;
                  const place = places[i];
                  const style =
                    RDV_STATUT_STYLES[b.detail.status as RdvStatut] ?? RDV_STATUT_STYLES.planifie;
                  const annule = b.detail.status === "annule";
                  return (
                    <button
                      key={b.detail.id}
                      type="button"
                      onClick={() => setOuvert(b.detail.id)}
                      title={`${b.heureCourte} - ${b.detail.nom || "Visiteur sans compte"}`}
                      className={`absolute rounded-md border px-1.5 py-1 text-left overflow-hidden cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-bronze/60 ${style.pill} ${
                        annule ? "opacity-60" : ""
                      }`}
                      style={{
                        top: y(b.debut) + 1,
                        height: Math.max(HAUTEUR_PAS - 3, y(b.fin) - y(b.debut) - 2),
                        left: `calc(${(place.colonne / place.total) * 100}% + 2px)`,
                        width: `calc(${100 / place.total}% - 4px)`,
                      }}
                    >
                      <div className="flex items-center gap-1 text-[10.5px] font-semibold tabular-nums leading-none">
                        {b.heureCourte}
                        <span className="font-normal opacity-70">{b.detail.type}</span>
                      </div>
                      <div
                        className={`text-[11.5px] leading-tight mt-1 truncate ${
                          annule ? "line-through" : ""
                        }`}
                      >
                        {b.detail.nom || "Visiteur"}
                      </div>
                      {b.detail.mode === "visio" && (
                        <div className="text-[10.5px] opacity-70 leading-none mt-1">Visio</div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {detailOuvert && (
        <RdvDetailModal data={detailOuvert} onClose={() => setOuvert(null)} />
      )}
    </>
  );
}
