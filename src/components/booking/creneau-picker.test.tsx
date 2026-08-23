import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { CreneauPicker } from "./creneau-picker";
import type { SlotAvailability } from "./actions";

/**
 * Le CreneauPicker ne connaît pas la grille : il affiche ce que
 * `get_slot_availability` rend et tient un créneau via `hold_slot`. On mocke
 * donc `./actions` pour piloter ces réponses, et on vérifie le comportement
 * propre au composant : hold, compte à rebours, créneau repris, grille vide,
 * bascule de jour, persistance du token.
 */
vi.mock("./actions", () => ({
  fetchAvailability: vi.fn(),
  holdSlot: vi.fn(),
}));
import { fetchAvailability, holdSlot } from "./actions";

const mockFetch = vi.mocked(fetchAvailability);
const mockHold = vi.mocked(holdSlot);

// Deux jours ouvrés distincts, heure du cabinet. Les valeurs `remaining`
// pilotent l'état de chaque créneau (libre / complet).
const DAY1_FREE = "2026-09-01T09:00:00+01:00";
const DAY1_FULL = "2026-09-01T09:30:00+01:00";
const DAY2_FREE = "2026-09-02T10:00:00+01:00";

function row(slot_start: string, remaining: number): SlotAvailability {
  return { slot_start, remaining };
}

/** Fait avancer le temps simulé et vide les microtâches (promesses awaited). */
async function flush(ms = 1) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** Monte le composant puis laisse le chargement différé (setTimeout 0) aboutir. */
async function mountLoaded(props: Parameters<typeof CreneauPicker>[0]) {
  render(<CreneauPicker {...props} />);
  await flush();
}

/**
 * Les boutons de créneau horaire du jour actif. Le calendrier ajoute des
 * boutons de jour ; on ne garde que ceux dont le libellé est une heure « HH:MM ».
 */
function slotButtons() {
  return screen.getAllByRole("button").filter((b) => /\d{1,2}:\d{2}/.test(b.textContent ?? ""));
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  mockFetch.mockReset();
  mockHold.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("chargement de la disponibilité", () => {
  it("rend les jours libres cliquables dans le calendrier et affiche les créneaux du jour actif", async () => {
    mockFetch.mockResolvedValue([
      row(DAY1_FREE, 1),
      row(DAY1_FULL, 0),
      row(DAY2_FREE, 2),
    ]);
    const onEmpty = vi.fn();

    await mountLoaded({ onSelect: vi.fn(), onEmptyChange: onEmpty });

    // Les deux jours libres (1er et 2 septembre) sont des cases cliquables.
    expect(screen.getByRole("button", { name: "1 septembre 2026" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "2 septembre 2026" })).toBeEnabled();
    // Le jour actif (le premier avec de la place) montre ses deux créneaux.
    expect(slotButtons()).toHaveLength(2);
    // La grille n'est pas vide : de la place existe.
    expect(onEmpty).toHaveBeenLastCalledWith(false);
  });

  it("grise le créneau complet et laisse le créneau libre cliquable", async () => {
    mockFetch.mockResolvedValue([row(DAY1_FREE, 1), row(DAY1_FULL, 0)]);

    await mountLoaded({ onSelect: vi.fn() });

    const [libre, complet] = slotButtons();
    expect(libre).toBeEnabled();
    expect(complet).toBeDisabled();
  });

  it("passe un token à fetchAvailability", async () => {
    mockFetch.mockResolvedValue([row(DAY1_FREE, 1)]);

    await mountLoaded({ onSelect: vi.fn() });

    // fetchAvailability(from, to, token) — le token est le 3e argument.
    const token = mockFetch.mock.calls[0][2];
    expect(token).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe("grille vide", () => {
  it("affiche le message d'absence de créneau et signale onEmptyChange(true) quand rien ne revient", async () => {
    mockFetch.mockResolvedValue([]);
    const onEmpty = vi.fn();

    await mountLoaded({ onSelect: vi.fn(), onEmptyChange: onEmpty });

    expect(screen.getByText(/Aucun créneau ouvert à la réservation/i)).toBeInTheDocument();
    expect(onEmpty).toHaveBeenLastCalledWith(true);
  });

  it("signale onEmptyChange(true) quand des jours existent mais tout est complet", async () => {
    mockFetch.mockResolvedValue([row(DAY1_FREE, 0), row(DAY1_FULL, 0)]);
    const onEmpty = vi.fn();

    await mountLoaded({ onSelect: vi.fn(), onEmptyChange: onEmpty });

    // Les jours s'affichent quand même, mais la capacité est nulle partout.
    expect(onEmpty).toHaveBeenLastCalledWith(true);
    for (const b of slotButtons()) expect(b).toBeDisabled();
  });
});

describe("tenir un créneau (hold)", () => {
  it("prévient le parent et lance le compte à rebours quand le hold réussit", async () => {
    mockFetch.mockResolvedValue([row(DAY1_FREE, 1)]);
    mockHold.mockResolvedValue(true);
    const onSelect = vi.fn();

    await mountLoaded({ onSelect });

    await act(async () => {
      fireEvent.click(slotButtons()[0]);
    });
    await flush();

    // holdSlot est appelé avec le créneau choisi et le token.
    expect(mockHold).toHaveBeenCalledWith(DAY1_FREE, expect.any(String));
    // Le parent reçoit (slotStart, token).
    expect(onSelect).toHaveBeenLastCalledWith(DAY1_FREE, expect.any(String));
    // Le compte à rebours s'affiche.
    expect(screen.getByText(/Créneau tenu pour vous/i)).toBeInTheDocument();
    // Le créneau est marqué sélectionné.
    expect(slotButtons()[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("annonce que le créneau vient d'être pris et recharge quand le hold échoue", async () => {
    mockFetch.mockResolvedValue([row(DAY1_FREE, 1)]);
    mockHold.mockResolvedValue(false);
    const onSelect = vi.fn();

    await mountLoaded({ onSelect });
    const fetchCallsBefore = mockFetch.mock.calls.length;

    await act(async () => {
      fireEvent.click(slotButtons()[0]);
    });
    await flush();

    expect(screen.getByText(/vient d'être pris/i)).toBeInTheDocument();
    // Pas de sélection remontée au parent.
    expect(onSelect).not.toHaveBeenCalledWith(DAY1_FREE, expect.any(String));
    // La grille se rafraîchit.
    expect(mockFetch.mock.calls.length).toBeGreaterThan(fetchCallsBefore);
  });
});

describe("expiration du hold", () => {
  it("libère la sélection et prévient le parent avec null au bout de 5 minutes", async () => {
    mockFetch.mockResolvedValue([row(DAY1_FREE, 1)]);
    mockHold.mockResolvedValue(true);
    const onSelect = vi.fn();

    await mountLoaded({ onSelect });
    await act(async () => {
      fireEvent.click(slotButtons()[0]);
    });
    await flush();
    expect(onSelect).toHaveBeenLastCalledWith(DAY1_FREE, expect.any(String));

    // Le hold dure 5 minutes : on les fait passer.
    await flush(5 * 60 * 1000);

    // La sélection tombe : le parent est prévenu avec null.
    expect(onSelect).toHaveBeenLastCalledWith(null, expect.any(String));
    expect(screen.getByText(/n'est plus réservé pour vous/i)).toBeInTheDocument();
  });
});

describe("bascule de jour", () => {
  it("affiche les créneaux du second jour quand on clique sa case dans le calendrier", async () => {
    mockFetch.mockResolvedValue([
      row(DAY1_FREE, 1),
      row(DAY1_FULL, 0),
      row(DAY2_FREE, 2),
    ]);

    await mountLoaded({ onSelect: vi.fn() });
    expect(slotButtons()).toHaveLength(2); // jour 1

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "2 septembre 2026" }));
    });
    await flush();

    // Le second jour n'a qu'un créneau.
    expect(slotButtons()).toHaveLength(1);
  });
});

describe("persistance du token", () => {
  it("réutilise le même token après un remontage (sessionStorage)", async () => {
    mockFetch.mockResolvedValue([row(DAY1_FREE, 1)]);

    await mountLoaded({ onSelect: vi.fn() });
    const first = mockFetch.mock.calls[0][2];

    cleanup();
    mockFetch.mockClear();

    await mountLoaded({ onSelect: vi.fn() });
    const second = mockFetch.mock.calls[0][2];

    expect(second).toBe(first);
  });
});
