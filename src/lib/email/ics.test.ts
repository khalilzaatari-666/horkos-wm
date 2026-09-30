import { describe, it, expect } from "vitest";
import { buildIcs } from "./ics";

const base = {
  uid: "appt-1",
  startIso: "2026-10-05T09:00:00Z",
  durationMin: 60,
  summary: "R1",
  organizer: { name: "Horkos", email: "contact@horkos-wm.com" },
  attendees: [{ name: "Jean", email: "jean@dupont.com" }],
};

/** Ce qui fait qu'un calendrier met à jour ou retire l'événement, plutôt que d'en ajouter un. */
describe("buildIcs", () => {
  it("invite par défaut, en séquence 0", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("SEQUENCE:0");
    expect(ics).toContain("STATUS:CONFIRMED");
  });

  it("annule sous le même UID", () => {
    const ics = buildIcs({ ...base, method: "CANCEL", sequence: 7 });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("SEQUENCE:7");
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("UID:appt-1@horkos-wm.com");
  });
});
