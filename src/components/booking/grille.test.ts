import { describe, it, expect } from "vitest";
import {
  DUREE_RDV_MIN,
  OUVERTURE,
  FERMETURE,
  DEJEUNER_DEBUT,
  DEJEUNER_FIN,
  isBookableStart,
  slotsOfDay,
  isJourOuvre,
  formatMinutes,
} from "./grille";

/**
 * Ce fichier verrouille la grille horaire. Son rôle explicite (voir l'en-tête de
 * grille.ts et de la migration 010) : si la liste des 13 débuts change ici sans
 * changer `_booking_starts()` côté SQL — ou l'inverse — un test casse.
 */

// La vérité partagée avec `public._booking_starts()` dans 010_booking.sql.
const STARTS_SQL = [540, 570, 600, 630, 660, 690, 840, 870, 900, 930, 960, 990, 1020];

describe("slotsOfDay — les 13 débuts d'une journée ouvrée", () => {
  it("rend exactement la liste que reflète _booking_starts() côté SQL", () => {
    expect(slotsOfDay()).toEqual(STARTS_SQL);
  });

  it("en propose treize", () => {
    expect(slotsOfDay()).toHaveLength(13);
  });

  it("commence à l'ouverture (09:00) et le dernier tient avant la fermeture (17:00 → 18:00)", () => {
    const slots = slotsOfDay();
    expect(slots[0]).toBe(OUVERTURE); // 09:00
    expect(slots[slots.length - 1]).toBe(FERMETURE - DUREE_RDV_MIN); // 17:00
  });

  it("laisse un trou pour le déjeuner : aucun début entre 11:30 et 14:00", () => {
    const midi = slotsOfDay().filter((m) => m > DEJEUNER_DEBUT - DUREE_RDV_MIN && m < DEJEUNER_FIN);
    expect(midi).toEqual([]);
  });

  it("aligne chaque début sur une demi-heure pleine", () => {
    for (const m of slotsOfDay()) expect(m % 30).toBe(0);
  });
});

describe("isBookableStart — un rendez-vous complet doit tenir dans une plage ouverte", () => {
  it("accepte le premier créneau du matin (09:00)", () => {
    expect(isBookableStart(OUVERTURE)).toBe(true);
  });

  it("accepte le dernier créneau du matin qui se termine pile au déjeuner (11:30 → 12:30)", () => {
    expect(isBookableStart(DEJEUNER_DEBUT - DUREE_RDV_MIN)).toBe(true); // 11:30
  });

  it("refuse un créneau qui déborderait sur le déjeuner (12:00 → 13:00)", () => {
    expect(isBookableStart(DEJEUNER_DEBUT - 30)).toBe(false); // 12:00
  });

  it("refuse un créneau qui commence pendant le déjeuner (12:30, 13:00, 13:30)", () => {
    expect(isBookableStart(DEJEUNER_DEBUT)).toBe(false); // 12:30
    expect(isBookableStart(13 * 60)).toBe(false); // 13:00
    expect(isBookableStart(DEJEUNER_FIN - 30)).toBe(false); // 13:30
  });

  it("accepte le premier créneau de l'après-midi (14:00)", () => {
    expect(isBookableStart(DEJEUNER_FIN)).toBe(true);
  });

  it("accepte le dernier créneau qui se termine pile à la fermeture (17:00 → 18:00)", () => {
    expect(isBookableStart(FERMETURE - DUREE_RDV_MIN)).toBe(true); // 17:00
  });

  it("refuse un créneau qui déborderait après la fermeture (17:30 → 18:30)", () => {
    expect(isBookableStart(FERMETURE - 30)).toBe(false); // 17:30
  });

  it("refuse tout début avant l'ouverture (08:30)", () => {
    expect(isBookableStart(OUVERTURE - 30)).toBe(false);
  });
});

describe("isJourOuvre — samedi et dimanche fermés", () => {
  it("ouvre du lundi (1) au vendredi (5)", () => {
    for (const day of [1, 2, 3, 4, 5]) expect(isJourOuvre(day)).toBe(true);
  });

  it("ferme le dimanche (0) et le samedi (6)", () => {
    expect(isJourOuvre(0)).toBe(false);
    expect(isJourOuvre(6)).toBe(false);
  });
});

describe("formatMinutes — minutes depuis minuit vers HH:MM", () => {
  it("zéro-remplit les heures et les minutes", () => {
    expect(formatMinutes(540)).toBe("09:00");
    expect(formatMinutes(570)).toBe("09:30");
    expect(formatMinutes(1020)).toBe("17:00");
  });

  it("gère minuit et une minute isolée", () => {
    expect(formatMinutes(0)).toBe("00:00");
    expect(formatMinutes(61)).toBe("01:01");
  });
});
