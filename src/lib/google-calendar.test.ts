import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { occupationsDe, chevauche } from "./google-calendar";

const H = 3_600_000;
const t = (iso: string) => Date.parse(iso);

describe("occupationsDe", () => {
  it("ne garde que ce qui rend l'agenda indisponible", () => {
    const occ = occupationsDe(
      [
        { id: "perso", start: { dateTime: "2026-10-05T10:00:00+01:00" }, end: { dateTime: "2026-10-05T11:00:00+01:00" } },
        { id: "annule", status: "cancelled", start: { dateTime: "2026-10-05T10:00:00+01:00" }, end: { dateTime: "2026-10-05T11:00:00+01:00" } },
        { id: "libre", transparency: "transparent", start: { dateTime: "2026-10-05T10:00:00+01:00" }, end: { dateTime: "2026-10-05T11:00:00+01:00" } },
        { id: "decline", attendees: [{ self: true, responseStatus: "declined" }], start: { dateTime: "2026-10-05T10:00:00+01:00" }, end: { dateTime: "2026-10-05T11:00:00+01:00" } },
        { id: "rdv-app", start: { dateTime: "2026-10-05T15:00:00+01:00" }, end: { dateTime: "2026-10-05T16:00:00+01:00" } },
        { id: "conge", start: { date: "2026-10-06" }, end: { date: "2026-10-07" } },
      ],
      new Set(["rdv-app"])
    );
    expect(occ).toEqual([
      { debut: t("2026-10-05T10:00:00+01:00"), fin: t("2026-10-05T11:00:00+01:00") },
      { debut: t("2026-10-06T00:00:00Z"), fin: t("2026-10-07T00:00:00Z") },
    ]);
  });
});

describe("chevauche", () => {
  const occ = [{ debut: t("2026-10-05T10:00:00+01:00"), fin: t("2026-10-05T11:00:00+01:00") }];

  it("bord contre bord n'est pas un chevauchement", () => {
    expect(chevauche("2026-10-05T09:00:00+01:00", 60, occ)).toBe(false);
    expect(chevauche("2026-10-05T11:00:00+01:00", 60, occ)).toBe(false);
  });

  it("à cheval ou dedans, si", () => {
    expect(chevauche("2026-10-05T09:30:00+01:00", 60, occ)).toBe(true);
    expect(chevauche("2026-10-05T10:15:00+01:00", 30, occ)).toBe(true);
    expect(chevauche("2026-10-05T09:00:00+01:00", 3 * 60, occ)).toBe(true);
  });

  it("une journée entière bloque la journée", () => {
    const conge = [{ debut: t("2026-10-06T00:00:00Z"), fin: t("2026-10-06T00:00:00Z") + 24 * H }];
    expect(chevauche("2026-10-06T14:00:00+01:00", 60, conge)).toBe(true);
  });
});
