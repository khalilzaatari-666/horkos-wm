import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Calendrier, type BlocSemaine, type JourSemaine } from "./calendrier";
import type { RdvDetailData } from "../rdv-detail";
import { OUVERTURE, FERMETURE } from "@/components/booking/grille";

/**
 * Le calendrier ne fait aucune requête : il place ce que la page lui donne. On
 * vérifie donc ce dont il est seul responsable - l'étirement de la grille, la
 * largeur des chevauchements, et l'ouverture du détail.
 */

const JOURS: JourSemaine[] = [
  { cle: "2026-09-07", label: "Lun. 7 sept.", aujourdhui: false },
  { cle: "2026-09-08", label: "Mar. 8 sept.", aujourdhui: true },
  { cle: "2026-09-09", label: "Mer. 9 sept.", aujourdhui: false },
  { cle: "2026-09-10", label: "Jeu. 10 sept.", aujourdhui: false },
  { cle: "2026-09-11", label: "Ven. 11 sept.", aujourdhui: false },
];

function detail(id: string, nom: string, extra: Partial<RdvDetailData> = {}): RdvDetailData {
  return {
    id,
    heure: "Mar. 8 sept. 2026, 10:00",
    type: "R0",
    mode: "presentiel",
    meetingUrl: null,
    nom,
    email: null,
    phone: null,
    sansCompte: false,
    advisorName: "Khalil Zaatari",
    status: "confirme",
    demande: null,
    ...extra,
  };
}

function bloc(
  id: string,
  nom: string,
  rang: number,
  debut: number,
  extra: Partial<RdvDetailData> = {}
): BlocSemaine {
  const h = String(Math.floor(debut / 60)).padStart(2, "0");
  const m = String(debut % 60).padStart(2, "0");
  return {
    rang,
    debut,
    fin: debut + 60,
    heureCourte: `${h}:${m}`,
    detail: detail(id, nom, extra),
  };
}

/** La hauteur en pixels d'une piste de jour, telle que le composant la calcule. */
function hauteurPiste(): number {
  const piste = document.querySelector<HTMLElement>("[style*='height']");
  return Number.parseFloat(piste!.style.height);
}

describe("Calendrier", () => {
  it("affiche une colonne par jour reçu", () => {
    render(<Calendrier jours={JOURS} blocs={[]} />);
    for (const j of JOURS) expect(screen.getByText(j.label)).toBeInTheDocument();
  });

  it("ouvre la grille sur les heures du cabinet quand rien n'en sort", () => {
    render(<Calendrier jours={JOURS} blocs={[bloc("a", "Amine", 1, 10 * 60)]} />);
    // 9h → 18h, par pas de 30 min : 18 pas de 38 px.
    expect(hauteurPiste()).toBe(((FERMETURE - OUVERTURE) / 30) * 38);
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("18:00")).toBeInTheDocument();
  });

  it("ancre la première et la dernière heure pour qu'elles ne soient pas rognées", () => {
    // Centrées sur leur trait, 09:00 et 18:00 débordaient du cadre arrondi, qui
    // les coupait en deux.
    render(<Calendrier jours={JOURS} blocs={[]} />);
    expect(screen.getByText("09:00").className).toContain("translate-y-0");
    expect(screen.getByText("18:00").className).toContain("-translate-y-full");
    // Une heure du milieu reste centrée sur son trait.
    expect(screen.getByText("13:00").className).toContain("-translate-y-1/2");
  });

  it("étire la grille pour un rendez-vous posé hors des heures d'ouverture", () => {
    // Un rendez-vous à 8h ne doit pas disparaître sous le haut de la grille.
    render(<Calendrier jours={JOURS} blocs={[bloc("a", "Amine", 0, 8 * 60)]} />);
    expect(hauteurPiste()).toBe(((FERMETURE - 8 * 60) / 30) * 38);
    // Le bloc se pose en haut de la grille, et non au-dessus d'elle.
    expect(screen.getByText("Amine").closest("button")!.style.top).toBe("1px");
  });

  it("place deux rendez-vous simultanés côte à côte", () => {
    render(
      <Calendrier
        jours={JOURS}
        blocs={[bloc("a", "Amine", 1, 10 * 60), bloc("b", "Bouchra", 1, 10 * 60)]}
      />
    );
    const a = screen.getByText("Amine").closest("button")!;
    const b = screen.getByText("Bouchra").closest("button")!;
    expect(a.style.width).toBe("calc(50% - 4px)");
    expect(b.style.width).toBe("calc(50% - 4px)");
    expect(a.style.left).not.toBe(b.style.left);
  });

  it("laisse toute la largeur à des rendez-vous qui ne se croisent pas", () => {
    render(
      <Calendrier
        jours={JOURS}
        blocs={[bloc("a", "Amine", 1, 10 * 60), bloc("b", "Bouchra", 1, 15 * 60)]}
      />
    );
    expect(screen.getByText("Amine").closest("button")!.style.width).toBe("calc(100% - 4px)");
    expect(screen.getByText("Bouchra").closest("button")!.style.width).toBe("calc(100% - 4px)");
  });

  it("ne fait pas se disputer la largeur à deux jours différents", () => {
    render(
      <Calendrier
        jours={JOURS}
        blocs={[bloc("a", "Amine", 1, 10 * 60), bloc("b", "Bouchra", 2, 10 * 60)]}
      />
    );
    expect(screen.getByText("Amine").closest("button")!.style.width).toBe("calc(100% - 4px)");
  });

  it("descend le bloc à hauteur de son heure", () => {
    render(<Calendrier jours={JOURS} blocs={[bloc("a", "Amine", 1, 11 * 60)]} />);
    // 11h, soit quatre pas après l'ouverture, plus le pixel de marge.
    expect(screen.getByText("Amine").closest("button")!.style.top).toBe("153px");
  });

  it("ouvre le détail au clic et le referme", () => {
    render(
      <Calendrier
        jours={JOURS}
        blocs={[
          bloc("a", "Amine", 1, 10 * 60, {
            contexte: {
              clientId: "c1",
              parcours: [
                { type: "R0", etat: "encours" },
                { type: "R1", etat: "avenir" },
                { type: "R2", etat: "avenir" },
              ],
              ficheAuditId: "f1",
              accessible: true,
            },
          }),
        ]}
      />
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("Amine").closest("button")!);

    const dialog = screen.getByRole("dialog");
    // Le contexte que l'agenda du cabinet ne porte pas : l'étape et la fiche.
    expect(dialog).toHaveTextContent("R0 - Audit patrimonial");
    expect(screen.getByRole("link", { name: /Fiche d'audit/ })).toHaveAttribute(
      "href",
      "/admin/clients/c1/audits/f1"
    );
    expect(screen.getByRole("link", { name: /Ouvrir le dossier/ })).toHaveAttribute(
      "href",
      "/admin/clients/c1/suivi"
    );

    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ne propose aucun lien sur un dossier piloté par un autre conseiller", () => {
    render(
      <Calendrier
        jours={JOURS}
        blocs={[
          bloc("a", "Amine", 1, 10 * 60, {
            contexte: {
              clientId: "c1",
              parcours: [{ type: "R0", etat: "fait" }],
              ficheAuditId: "f1",
              accessible: false,
            },
          }),
        ]}
      />
    );
    fireEvent.click(screen.getByText("Amine").closest("button")!);
    expect(screen.queryByRole("link", { name: /Fiche d'audit/ })).toBeNull();
    expect(screen.getByRole("dialog")).toHaveTextContent("piloté par son conseiller référent");
  });

  it("barre le nom d'un rendez-vous annulé", () => {
    render(<Calendrier jours={JOURS} blocs={[bloc("a", "Amine", 1, 10 * 60, { status: "annule" })]} />);
    expect(screen.getByText("Amine").className).toContain("line-through");
  });

  it("nomme « Visiteur » un rendez-vous sans compte", () => {
    render(
      <Calendrier jours={JOURS} blocs={[bloc("a", "", 1, 10 * 60, { sansCompte: true })]} />
    );
    expect(screen.getByText("Visiteur")).toBeInTheDocument();
  });
});
