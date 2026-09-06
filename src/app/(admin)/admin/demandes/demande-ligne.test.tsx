import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemandeLigne, type DemandeLigneData } from "./demande-ligne";

/**
 * La ligne porte à elle seule la règle qui compte : ouvrir vaut lecture, et
 * cette lecture part en base une fois pour toute l'équipe. On vérifie donc le
 * dépliage, la pastille, et surtout le nombre exact d'appels à l'action - une
 * lecture comptée deux fois n'aurait pas d'effet visible, une lecture jamais
 * envoyée laisserait la pastille allumée chez les collègues.
 */

const marquerLue = vi.fn(async () => {});
const changerStatut = vi.fn();
const supprimer = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

function ligne(over: Partial<DemandeLigneData> = {}): DemandeLigneData {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    nom: "Amine Berrada",
    soustitre: null,
    objet: "Poser une question",
    message: "Bonjour, je souhaiterais savoir si vous accompagnez les non-résidents.",
    email: "amine@example.ma",
    telephone: "+212600000000",
    recuLe: "8 septembre 2026 à 10h00",
    recuRelatif: "il y a 2 h",
    nonLue: true,
    statut: { label: "Nouveau", tone: "attente" },
    transitions: [{ vers: "traite", label: "Marquer traité" }],
    sujetReponse: "Re : Poser une question",
    ...over,
  };
}

function poser(data: DemandeLigneData) {
  return render(
    <ul>
      <DemandeLigne
        data={data}
        marquerLue={marquerLue}
        changerStatut={changerStatut}
        supprimer={supprimer}
      />
    </ul>
  );
}

/** Le bouton d'en-tête, seul élément cliquable de la ligne repliée. */
function entete() {
  return screen.getByRole("button", { expanded: false });
}

describe("DemandeLigne", () => {
  it("reste repliée au départ et ne montre qu'un aperçu", () => {
    poser(ligne());
    expect(entete()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Marquer traité/)).toBeNull();
  });

  it("signale une demande que personne n'a ouverte", () => {
    poser(ligne());
    expect(screen.getByText(/non lue/)).toBeInTheDocument();
  });

  it("ne signale rien sur une demande déjà ouverte par un collègue", () => {
    poser(ligne({ nonLue: false }));
    expect(screen.queryByText(/non lue/)).toBeNull();
  });

  it("déplie le message complet au clic", () => {
    poser(ligne());
    fireEvent.click(entete());
    expect(
      screen.getByText(/vous accompagnez les non-résidents/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marquer traité" })).toBeInTheDocument();
  });

  it("efface la pastille dès l'ouverture, sans attendre le serveur", () => {
    poser(ligne());
    fireEvent.click(entete());
    expect(screen.queryByText(/non lue/)).toBeNull();
  });

  it("envoie la lecture une seule fois", () => {
    poser(ligne());
    fireEvent.click(entete());
    expect(marquerLue).toHaveBeenCalledTimes(1);
    expect(marquerLue).toHaveBeenCalledWith(ligne().id);
  });

  it("ne renvoie rien quand on replie puis rouvre", () => {
    // Sans le garde, chaque coup d'œil réécrirait `read_at` - et le premier
    // lecteur enregistré ne serait plus le premier.
    poser(ligne());
    const bouton = screen.getByRole("button", { expanded: false });
    fireEvent.click(bouton); // ouvre
    fireEvent.click(bouton); // replie
    fireEvent.click(bouton); // rouvre
    expect(marquerLue).toHaveBeenCalledTimes(1);
  });

  it("n'envoie aucune lecture sur une demande déjà lue", () => {
    poser(ligne({ nonLue: false }));
    fireEvent.click(entete());
    expect(marquerLue).not.toHaveBeenCalled();
  });

  it("propose de répondre à l'adresse, objet pré-rempli", () => {
    poser(ligne());
    fireEvent.click(entete());
    const lien = screen.getByRole("link", { name: /Répondre/ });
    expect(lien).toHaveAttribute(
      "href",
      `mailto:amine@example.ma?subject=${encodeURIComponent("Re : Poser une question")}`
    );
  });

  it("affiche la société quand il y en a une", () => {
    poser(ligne({ soustitre: "Étude Idrissi" }));
    expect(screen.getByText("Étude Idrissi")).toBeInTheDocument();
  });

  it("supporte une demande sans message", () => {
    poser(ligne({ message: null }));
    fireEvent.click(entete());
    expect(screen.getByText("Aucun message joint.")).toBeInTheDocument();
  });
});
