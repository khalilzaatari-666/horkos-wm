"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAvailability, holdSlot, type SlotAvailability } from "./actions";
import { JOURS_PROPOSES } from "./grille";

/** Fuseau du cabinet : les créneaux s'affichent en heure marocaine. */
const TZ = "Africa/Casablanca";
const HOLD_SECONDS = 5 * 60;
const TOKEN_KEY = "horkos-hold-token";

interface CreneauPickerProps {
  /**
   * Prévenu à chaque changement : un créneau tenu (`slotStart` + `token`), ou
   * `null` quand la sélection tombe (expiration du hold, créneau repris).
   */
  onSelect: (slotStart: string | null, token: string) => void;
  /**
   * Prévenu quand la grille est totalement vide (aucun conseiller en base,
   * tout complet) : le parent doit alors laisser passer sans créneau plutôt
   * que de bloquer l'utilisateur sur une étape sans issue.
   */
  onEmptyChange?: (empty: boolean) => void;
}

interface Day {
  key: string; // YYYY-MM-DD en heure cabinet
  label: string; // « lun. 17 août »
  slots: SlotAvailability[];
}

const dayKeyFmt = new Intl.DateTimeFormat("fr-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dayLabelFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const hourFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Le token survit à un rechargement : le hold reste le nôtre pendant 5 min.
 *
 * Appelé comme initialiseur de `useState`, donc aussi au rendu serveur, où
 * `sessionStorage` n'existe pas : le catch y répond par un token jetable, que
 * l'hydratation remplace par celui du navigateur.
 */
function getToken(): string {
  try {
    const existing = sessionStorage.getItem(TOKEN_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(TOKEN_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Grille de réservation partagée — questionnaire public et espace client.
 *
 * Le composant ne connaît ni la grille ni la capacité : il affiche ce que
 * `get_slot_availability` retourne et tient le créneau choisi via `hold_slot`.
 * Toute décision reste côté Postgres, seule autorité sur la disponibilité.
 */
export function CreneauPicker({ onSelect, onEmptyChange }: CreneauPickerProps) {
  const [token] = useState<string>(getToken);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Les callbacks du parent passent par des refs : un parent qui les écrit en
  // ligne (`onSelect={(s, t) => …}`) en changerait l'identité à chaque rendu,
  // et l'effet de chargement repartirait en boucle.
  const onSelectRef = useRef(onSelect);
  const onEmptyRef = useRef(onEmptyChange);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onEmptyRef.current = onEmptyChange;
  });

  const load = useCallback(
    async (tok: string) => {
      // Pas de `setLoading(true)` ici : l'état initial l'est déjà, et les
      // rafraîchissements suivants gardent la grille affichée plutôt que de la
      // faire clignoter.
      // Assez de jours calendaires pour couvrir les jours ouvrés proposés.
      const from = new Date();
      const to = new Date(from.getTime() + (JOURS_PROPOSES * 2 + 4) * 86_400_000);
      const rows = await fetchAvailability(
        dayKeyFmt.format(from),
        dayKeyFmt.format(to),
        tok
      );

      const byDay = new Map<string, Day>();
      for (const row of rows) {
        const date = new Date(row.slot_start);
        const key = dayKeyFmt.format(date);
        const day = byDay.get(key) ?? { key, label: dayLabelFmt.format(date), slots: [] };
        day.slots.push(row);
        byDay.set(key, day);
      }
      const list = [...byDay.values()].slice(0, JOURS_PROPOSES);
      setDays(list);
      // Vide = aucun jour, ou aucun créneau restant nulle part.
      onEmptyRef.current?.(!list.some((d) => d.slots.some((s) => s.remaining > 0)));
      setActiveDay((current) => {
        if (current && list.some((d) => d.key === current)) return current;
        // Premier jour où il reste quelque chose, sinon le premier tout court.
        return (list.find((d) => d.slots.some((s) => s.remaining > 0)) ?? list[0])?.key ?? null;
      });
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    // Différé d'un tick : la règle `set-state-in-effect` suit les setState de
    // `load` même derrière l'await ; sorti du corps de l'effet, le chargement
    // ne peut plus cascader sur le rendu en cours.
    const id = setTimeout(() => void load(token), 0);
    return () => clearTimeout(id);
  }, [token, load]);

  const releaseSelection = useCallback(
    (message: string | null) => {
      clearInterval(timer.current);
      setSelected(null);
      setRemainingSec(0);
      if (message) setNotice(message);
      if (token) {
        onSelectRef.current(null, token);
        void load(token);
      }
    },
    [token, load]
  );

  // Compte à rebours du hold. À zéro, la sélection tombe et la grille se
  // rafraîchit — le serveur, lui, a déjà oublié le hold.
  useEffect(() => {
    if (!selected) return;
    timer.current = setInterval(() => {
      setRemainingSec((s) => {
        if (s > 1) return s - 1;
        releaseSelection("Le créneau n'est plus réservé pour vous. Choisissez-en un à nouveau.");
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [selected, releaseSelection]);

  const choose = async (slot: SlotAvailability) => {
    if (!token || pendingSlot) return;
    setNotice(null);
    setPendingSlot(slot.slot_start);
    const ok = await holdSlot(slot.slot_start, token);
    setPendingSlot(null);

    if (!ok) {
      // Pris entre l'affichage et le clic : la grille se met à jour, le
      // créneau se grise au lieu de disparaître.
      setNotice("Ce créneau vient d'être pris. En voici la disponibilité à jour.");
      void load(token);
      return;
    }

    clearInterval(timer.current);
    setSelected(slot.slot_start);
    setRemainingSec(HOLD_SECONDS);
    onSelectRef.current(slot.slot_start, token);
  };

  const active = useMemo(() => days.find((d) => d.key === activeDay), [days, activeDay]);

  if (loading && days.length === 0) {
    return (
      <div className="py-10 text-center text-[13px] text-warm-grey">
        Chargement des disponibilités…
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="py-10 text-center text-[13px] text-warm-grey leading-[1.65]">
        Aucun créneau ouvert à la réservation pour l&apos;instant.
        <br />
        Envoyez votre demande : un conseiller vous rappelle pour convenir d&apos;une heure.
      </div>
    );
  }

  return (
    <div>
      {/* Bande des jours */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Choisir un jour"
      >
        {days.map((day) => {
          const isActive = day.key === activeDay;
          const hasRoom = day.slots.some((s) => s.remaining > 0);
          return (
            <button
              key={day.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveDay(day.key)}
              className={`shrink-0 px-4 py-2.5 rounded-lg border text-[13px] transition-colors cursor-pointer ${
                isActive
                  ? "border-bronze bg-bronze/10 text-ink font-medium"
                  : hasRoom
                    ? "border-cream-deep bg-white text-charcoal hover:border-bronze/50"
                    : "border-cream-deep bg-cream/60 text-warm-grey"
              }`}
            >
              {day.label}
              {!hasRoom && <span className="block text-[10.5px] mt-0.5">complet</span>}
            </button>
          );
        })}
      </div>

      {/* Grille des heures du jour actif */}
      {active && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {active.slots.map((slot) => {
            const isSelected = slot.slot_start === selected;
            const full = slot.remaining <= 0 && !isSelected;
            return (
              <button
                key={slot.slot_start}
                type="button"
                disabled={full || pendingSlot !== null}
                aria-pressed={isSelected}
                onClick={() => choose(slot)}
                className={`px-3 py-2.5 rounded-lg border text-[13.5px] tabular-nums transition-colors ${
                  isSelected
                    ? "border-bronze bg-bronze text-white font-medium"
                    : full
                      ? "border-cream-deep bg-cream/60 text-warm-grey/70 line-through cursor-not-allowed"
                      : "border-cream-deep bg-white text-charcoal hover:border-bronze/60 cursor-pointer"
                } ${pendingSlot === slot.slot_start ? "opacity-60" : ""}`}
              >
                {hourFmt.format(new Date(slot.slot_start))}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 min-h-[20px]" aria-live="polite">
        {selected ? (
          <p className="text-[12.5px] text-bronze-dark">
            Créneau tenu pour vous pendant{" "}
            <span className="tabular-nums font-medium">
              {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, "0")}
            </span>
            {" "}— terminez votre demande pour le confirmer.
          </p>
        ) : notice ? (
          <p className="text-[12.5px] text-charcoal">{notice}</p>
        ) : (
          <p className="text-[12px] text-warm-grey">
            Rendez-vous d&apos;une heure, heure marocaine (GMT+1).
          </p>
        )}
      </div>
    </div>
  );
}
