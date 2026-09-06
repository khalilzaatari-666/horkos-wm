import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RappelForm } from "./rappel-form";
import { QUANTITE_MAX } from "@/lib/rappels";

/**
 * L'aperçu d'échéance est tout l'intérêt du formulaire : « dans 3 mois » ne dit
 * rien, « le mardi 8 décembre » si. On vérifie donc qu'il suit la saisie, et
 * que les bornes coupent le geste avant l'aller-retour serveur.
 */
vi.mock("./actions", () => ({
  poserRappel: vi.fn(async () => ({ status: "idle" })),
}));

const CLIENT = "11111111-1111-4111-8111-111111111111";
const RDV = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.useFakeTimers();
  // Un mardi, pour que l'aperçu soit vérifiable au jour près.
  vi.setSystemTime(new Date("2026-09-08T09:00:00.000Z"));
});

function poser() {
  return render(<RappelForm clientId={CLIENT} appointmentId={RDV} />);
}

const delai = () => screen.getByLabelText("Délai") as HTMLInputElement;
const unite = () => screen.getByLabelText("Unité") as HTMLSelectElement;

describe("RappelForm", () => {
  it("part sur trois jours", () => {
    poser();
    expect(delai().value).toBe("3");
    expect(unite().value).toBe("jours");
    expect(screen.getByText(/Dans 3 jours/)).toBeInTheDocument();
  });

  it("accorde le libellé au singulier", () => {
    poser();
    fireEvent.change(delai(), { target: { value: "1" } });
    expect(screen.getByText(/Dans 1 jour,/)).toBeInTheDocument();
  });

  it("annonce la date d'échéance en clair", () => {
    // 8 septembre + 3 jours = le vendredi 11.
    poser();
    expect(screen.getByText(/vendredi 11 septembre/)).toBeInTheDocument();
  });

  it("suit le changement d'unité", () => {
    poser();
    fireEvent.change(unite(), { target: { value: "heures" } });
    expect(screen.getByText(/Dans 3 heures/)).toBeInTheDocument();
    // 10h du matin au cabinet (UTC+1) + 3 h.
    expect(screen.getByText(/13:00/)).toBeInTheDocument();
  });

  it("compte les mois sur le calendrier, pas en jours", () => {
    poser();
    fireEvent.change(unite(), { target: { value: "mois" } });
    fireEvent.change(delai(), { target: { value: "2" } });
    expect(screen.getByText(/8 novembre/)).toBeInTheDocument();
  });

  it("refuse un délai nul et empêche l'envoi", () => {
    poser();
    fireEvent.change(delai(), { target: { value: "0" } });
    expect(screen.getByText(/hors limites/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Poser le rappel" })).toBeDisabled();
  });

  it("refuse au-delà de l'horizon maximal", () => {
    poser();
    fireEvent.change(unite(), { target: { value: "mois" } });
    fireEvent.change(delai(), { target: { value: String(QUANTITE_MAX.mois + 1) } });
    expect(screen.getByRole("button", { name: "Poser le rappel" })).toBeDisabled();
  });

  it("transporte le client et le rendez-vous jusqu'à l'action", () => {
    const { container } = poser();
    const cache = (name: string) =>
      container.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
    expect(cache("clientId")).toBe(CLIENT);
    expect(cache("appointmentId")).toBe(RDV);
  });

  it("laisse la note facultative", () => {
    poser();
    const note = screen.getByPlaceholderText(/Note \(facultative\)/) as HTMLInputElement;
    expect(note.required).toBe(false);
    expect(note.name).toBe("note");
  });
});
