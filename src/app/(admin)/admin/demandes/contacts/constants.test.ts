import { describe, it, expect } from "vitest";
import {
  CONTACT_STATUTS,
  CONTACT_STATUT_LABELS,
  CONTACT_TRANSITIONS,
  type ContactStatut,
} from "./constants";

describe("CONTACT_TRANSITIONS", () => {
  it("ne propose jamais de passer un message en « lu »", () => {
    // La lecture est portée par `read_at`, renseigné à l'ouverture du message.
    // Un bouton qui écrirait `status = 'lu'` créerait un second « lu » que la
    // pastille ignore - et le message aurait de toute façon déjà été ouvert
    // pour que le bouton soit atteignable.
    const cibles = Object.values(CONTACT_TRANSITIONS).flatMap((ts) => ts.map((t) => t.vers));
    expect(cibles).not.toContain("lu");
  });

  it("mène un message neuf directement au traitement", () => {
    expect(CONTACT_TRANSITIONS.nouveau).toEqual([{ vers: "traite", label: "Marquer traité" }]);
  });

  it("laisse avancer les messages déjà classés « lu » par l'ancien flux", () => {
    // Le statut existe encore en base : ces messages doivent pouvoir bouger.
    const cibles = CONTACT_TRANSITIONS.lu.map((t) => t.vers);
    expect(cibles).toContain("traite");
    expect(cibles).toContain("nouveau");
  });

  it("offre une sortie depuis chaque statut", () => {
    for (const statut of CONTACT_STATUTS) {
      expect(CONTACT_TRANSITIONS[statut].length).toBeGreaterThan(0);
    }
  });

  it("ne vise que des statuts que la base accepte", () => {
    const connus = new Set<string>(CONTACT_STATUTS);
    for (const transitions of Object.values(CONTACT_TRANSITIONS)) {
      for (const t of transitions) expect(connus.has(t.vers)).toBe(true);
    }
  });

  it("ne propose jamais un statut de départ comme destination", () => {
    for (const statut of Object.keys(CONTACT_TRANSITIONS) as ContactStatut[]) {
      expect(CONTACT_TRANSITIONS[statut].map((t) => t.vers)).not.toContain(statut);
    }
  });

  it("donne un libellé à chaque statut", () => {
    for (const statut of CONTACT_STATUTS) {
      expect(CONTACT_STATUT_LABELS[statut].label).toBeTruthy();
    }
  });
});
