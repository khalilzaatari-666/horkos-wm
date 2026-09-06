import { describe, it, expect } from "vitest";
import { aUneSessionProbable, estArriveeDirecte, espaceDuRole } from "./accueil";

describe("aUneSessionProbable", () => {
  it("reconnaît le cookie de session de Supabase", () => {
    expect(aUneSessionProbable(["sb-abcdefgh-auth-token"])).toBe(true);
  });

  it("reconnaît un jeton découpé en morceaux", () => {
    // Au-delà de la taille d'un cookie, `@supabase/ssr` numérote les parties.
    expect(aUneSessionProbable(["sb-abcdefgh-auth-token.0", "sb-abcdefgh-auth-token.1"])).toBe(
      true
    );
  });

  it("ignore le vérificateur posé pendant une connexion en cours", () => {
    // Il existe avant toute session : le prendre pour un compte connecté
    // enverrait un visiteur en train de se connecter vers un espace vide.
    expect(aUneSessionProbable(["sb-abcdefgh-auth-token-code-verifier"])).toBe(false);
  });

  it("ignore les cookies étrangers à l'authentification", () => {
    expect(aUneSessionProbable([])).toBe(false);
    expect(aUneSessionProbable(["umami.cache", "theme", "sb-provider-token-hint"])).toBe(false);
  });
});

describe("estArriveeDirecte", () => {
  it("retient une adresse saisie, un favori ou l'historique", () => {
    expect(estArriveeDirecte("none", "document")).toBe(true);
  });

  it("écarte un lien interne", () => {
    // « Retour au site » depuis l'espace client : la page d'accueil doit
    // s'afficher, sinon le lien ne mène nulle part.
    expect(estArriveeDirecte("same-origin", "document")).toBe(false);
  });

  it("écarte une arrivée depuis un autre site", () => {
    // Un résultat de recherche ou un lien d'e-mail visait cette page-là.
    expect(estArriveeDirecte("cross-site", "document")).toBe(false);
    expect(estArriveeDirecte("same-site", "document")).toBe(false);
  });

  it("écarte ce qui n'est pas une navigation", () => {
    // Préchargements et charges utiles RSC : des requêtes de fond, pas des
    // arrivées.
    expect(estArriveeDirecte("none", "empty")).toBe(false);
    expect(estArriveeDirecte("none", null)).toBe(false);
  });

  it("laisse passer quand le navigateur ne dit rien", () => {
    // En-tête absent : on affiche le site public plutôt que de détourner à
    // l'aveugle.
    expect(estArriveeDirecte(null, null)).toBe(false);
    expect(estArriveeDirecte(null, "document")).toBe(false);
  });
});

describe("espaceDuRole", () => {
  it("envoie l'équipe au back-office", () => {
    expect(espaceDuRole("admin")).toBe("/admin");
    expect(espaceDuRole("conseiller")).toBe("/admin");
  });

  it("envoie le client dans son espace", () => {
    expect(espaceDuRole("client")).toBe("/espace");
  });

  it("choisit l'espace client quand le rôle est illisible", () => {
    // Le moins privilégié des deux : le back-office revérifie de toute façon.
    expect(espaceDuRole(null)).toBe("/espace");
    expect(espaceDuRole(undefined)).toBe("/espace");
    expect(espaceDuRole("")).toBe("/espace");
  });
});
