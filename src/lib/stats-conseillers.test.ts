import { describe, it, expect } from "vitest";
import { niveauObjectif, agregerStats, OBJECTIFS_HEBDO } from "./stats-conseillers";

describe("niveauObjectif", () => {
  it("est atteint à l'objectif et au-delà", () => {
    expect(niveauObjectif(10, OBJECTIFS_HEBDO.R0)).toBe("atteint");
    expect(niveauObjectif(14, OBJECTIFS_HEBDO.R0)).toBe("atteint");
  });

  it("est proche à partir de 60 % de l'objectif", () => {
    expect(niveauObjectif(6, OBJECTIFS_HEBDO.R0)).toBe("proche");
    expect(niveauObjectif(3, OBJECTIFS_HEBDO.R1)).toBe("proche");
    expect(niveauObjectif(2, OBJECTIFS_HEBDO.R2)).toBe("proche");
  });

  it("est loin en dessous", () => {
    expect(niveauObjectif(5, OBJECTIFS_HEBDO.R0)).toBe("loin");
    expect(niveauObjectif(2, OBJECTIFS_HEBDO.R1)).toBe("loin");
    expect(niveauObjectif(1, OBJECTIFS_HEBDO.R2)).toBe("loin");
    expect(niveauObjectif(0, OBJECTIFS_HEBDO.R2)).toBe("loin");
  });
});

describe("agregerStats", () => {
  const equipe = [
    { id: "a", nom: "Alice" },
    { id: "b", nom: "Bob" },
  ];

  it("ventile tenus et fixés par conseiller, avec une ligne par membre", () => {
    const stats = agregerStats(
      equipe,
      [
        { advisor_id: "a", type: "R0" },
        { advisor_id: "a", type: "R0" },
        { advisor_id: "a", type: "R2" },
        { advisor_id: "b", type: "R1" },
      ],
      [
        { advisor_id: "a", type: "R1" },
        { advisor_id: "b", type: "R2" },
        { advisor_id: "b", type: "R2" },
      ]
    );
    expect(stats).toEqual([
      { id: "a", nom: "Alice", tenus: { R0: 2, R1: 0, R2: 1 }, fixes: { R1: 1, R2: 0 } },
      { id: "b", nom: "Bob", tenus: { R0: 0, R1: 1, R2: 0 }, fixes: { R1: 0, R2: 2 } },
    ]);
  });

  it("ignore les rendez-vous sans conseiller, d'un inconnu ou d'un autre type", () => {
    const stats = agregerStats(
      equipe,
      [
        { advisor_id: null, type: "R0" },
        { advisor_id: "zz", type: "R0" },
        { advisor_id: "a", type: "revue" },
      ],
      [{ advisor_id: "a", type: "R0" }]
    );
    expect(stats[0].tenus).toEqual({ R0: 0, R1: 0, R2: 0 });
    expect(stats[0].fixes).toEqual({ R1: 0, R2: 0 });
  });
});
