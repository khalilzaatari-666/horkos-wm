import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DemandesTabs, type OngletDemandes } from "./tabs";

/** L'onglet actif se déduit du chemin : on pilote donc `usePathname`. */
const pathname = vi.fn(() => "/admin/demandes/contacts");
vi.mock("next/navigation", () => ({
  usePathname: () => pathname(),
}));

const ONGLETS: OngletDemandes[] = [
  { href: "/admin/demandes/contacts", label: "Contacts", nonLues: 3 },
  { href: "/admin/demandes/partenariats", label: "Partenariats", nonLues: 0 },
];

describe("DemandesTabs", () => {
  it("compte les non-lues, et se tait quand il n'y en a pas", () => {
    render(<DemandesTabs onglets={ONGLETS} />);
    expect(screen.getByLabelText("3 non lues")).toHaveTextContent("3");
    // Partenariats est à zéro : un « 0 » rouge attirerait l'œil pour rien.
    expect(screen.queryByLabelText(/0 non lue/)).toBeNull();
  });

  it("accorde le libellé au singulier", () => {
    render(<DemandesTabs onglets={[{ ...ONGLETS[0], nonLues: 1 }]} />);
    expect(screen.getByLabelText("1 non lue")).toBeInTheDocument();
  });

  it("marque l'onglet du chemin courant", () => {
    render(<DemandesTabs onglets={ONGLETS} />);
    expect(screen.getByRole("link", { name: /Contacts/ })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: /Partenariats/ })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("suit le chemin quand on change d'onglet", () => {
    pathname.mockReturnValue("/admin/demandes/partenariats");
    render(<DemandesTabs onglets={ONGLETS} />);
    expect(screen.getByRole("link", { name: /Partenariats/ })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
