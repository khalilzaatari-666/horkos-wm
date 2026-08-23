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
  slots: SlotAvailability[];
}

const dayKeyFmt = new Intl.DateTimeFormat("fr-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const hourFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Noms français en dur pour l'ossature du calendrier : les jours-clés sont déjà
// des dates du cabinet (dayKeyFmt), donc l'affichage n'a plus besoin de fuseau,
// et on évite les pièges de décalage de mois au bord d'un mois.
const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const WEEKDAYS_FR = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

/** « 2026-08 » décalé de `delta` mois, toujours « YYYY-MM ». */
function stepMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

interface CalendarProps {
  month: string; // « YYYY-MM » affiché
  activeDay: string | null;
  /** « YYYY-MM-DD » → reste-t-il de la place. Absent = jour non proposé. */
  availByDay: Map<string, boolean>;
  todayKey: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPick: (key: string) => void;
}

/**
 * Calendrier mensuel de sélection du jour. Seuls les jours ouvrés proposés et
 * encore ouverts sont cliquables ; un jour complet reste visible mais barré,
 * un jour hors fenêtre s'estompe. La navigation est bornée aux mois que couvre
 * la disponibilité, pour ne pas errer dans des mois vides.
 */
function Calendar({
  month, activeDay, availByDay, todayKey, canPrev, canNext, onPrev, onNext, onPick,
}: CalendarProps) {
  const [y, m] = month.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  // Lundi = 0 : le cabinet raisonne en semaine ouvrée.
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const nbDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: nbDays }, (_, i) => i + 1),
  ];

  const navBtn =
    "w-8 h-8 grid place-items-center rounded-md text-charcoal transition-colors " +
    "enabled:hover:bg-cream enabled:cursor-pointer disabled:text-warm-grey/30";

  return (
    <div className="rounded-lg border border-cream-deep bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={onPrev} disabled={!canPrev} aria-label="Mois précédent" className={navBtn}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[13.5px] font-medium text-ink">
          {cap(MONTHS_FR[m - 1])} {y}
        </div>
        <button type="button" onClick={onNext} disabled={!canNext} aria-label="Mois suivant" className={navBtn}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_FR.map((w) => (
          <div key={w} className="text-center text-[11px] text-warm-grey py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`pad-${i}`} />;
          const key = `${y}-${pad(m)}-${pad(d)}`;
          const known = availByDay.has(key);
          const hasRoom = availByDay.get(key) === true;
          const isSelected = key === activeDay;
          const isToday = key === todayKey;
          const selectable = known && hasRoom;
          return (
            <button
              key={key}
              type="button"
              disabled={!selectable}
              aria-pressed={isSelected}
              aria-label={`${d} ${MONTHS_FR[m - 1]} ${y}${known && !hasRoom ? " - complet" : ""}`}
              onClick={() => onPick(key)}
              className={`h-9 rounded-md text-[13px] tabular-nums transition-colors ${
                isSelected
                  ? "bg-bronze text-white font-medium"
                  : selectable
                    ? "text-ink hover:bg-bronze/10 cursor-pointer"
                    : known
                      ? "text-warm-grey/70 line-through cursor-not-allowed"
                      : "text-warm-grey/30 cursor-not-allowed"
              } ${isToday && !isSelected ? "ring-1 ring-bronze/40" : ""}`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
 * Grille de réservation partagée - questionnaire public et espace client.
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
        const day = byDay.get(key) ?? { key, slots: [] };
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
  // rafraîchit - le serveur, lui, a déjà oublié le hold.
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

  // Disponibilité par jour (« YYYY-MM-DD » → reste-t-il de la place), pour le
  // calendrier : un jour complet se voit mais ne se clique pas.
  const availByDay = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const d of days) map.set(d.key, d.slots.some((s) => s.remaining > 0));
    return map;
  }, [days]);

  // Les mois couverts par la fenêtre proposée (un, parfois deux quand elle
  // chevauche la fin d'un mois), triés : ils bornent la navigation.
  const monthSpan = useMemo(() => {
    const set = new Set<string>();
    for (const d of days) set.add(d.key.slice(0, 7));
    return [...set].sort();
  }, [days]);

  // Le mois affiché suit le jour actif tant que l'utilisateur n'a pas navigué.
  const [viewMonth, setViewMonth] = useState<string | null>(null);
  const activeMonth = activeDay ? activeDay.slice(0, 7) : null;
  const displayMonth = viewMonth ?? activeMonth ?? monthSpan[0] ?? null;
  const todayKey = dayKeyFmt.format(new Date());

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
        De nouveaux créneaux s&apos;ouvrent régulièrement - réessayez un peu plus tard.
      </div>
    );
  }

  return (
    <div>
      {/* Sélection du jour : un calendrier mensuel. */}
      {displayMonth && (
        <Calendar
          month={displayMonth}
          activeDay={activeDay}
          availByDay={availByDay}
          todayKey={todayKey}
          canPrev={displayMonth > monthSpan[0]}
          canNext={displayMonth < monthSpan[monthSpan.length - 1]}
          onPrev={() => setViewMonth(stepMonth(displayMonth, -1))}
          onNext={() => setViewMonth(stepMonth(displayMonth, 1))}
          onPick={setActiveDay}
        />
      )}

      {/* Heures du jour actif. Flex centré plutôt qu'une grille : la dernière
          rangée incomplète (13 créneaux ne se divisent ni par 3 ni par 4) se
          centre au lieu de laisser un créneau orphelin collé à gauche. Chaque
          bouton garde la largeur d'une colonne - 3 sur mobile, 4 dès `sm`. */}
      {active && (
        <div className="flex flex-wrap justify-center gap-2 mt-3">
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
                className={`grow-0 shrink-0 basis-[calc((100%_-_1rem)/3)] sm:basis-[calc((100%_-_1.5rem)/4)] px-3 py-2.5 rounded-lg border text-[13.5px] tabular-nums transition-colors ${
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
            {" "}- terminez votre demande pour le confirmer.
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
