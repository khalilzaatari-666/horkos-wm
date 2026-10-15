import { render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CookieConsent, GererCookies } from "./cookie-consent";

afterEach(() => {
  document.cookie = "horkos_consentement=; Max-Age=0; Path=/";
});

describe("CookieConsent", () => {
  it("garde le choix et le rouvre depuis « Gérer les cookies »", () => {
    render(
      <>
        <CookieConsent />
        <GererCookies />
      </>
    );
    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    expect(document.cookie).toContain("horkos_consentement=non");
    expect(screen.queryByRole("button", { name: "Refuser" })).toBeNull();

    act(() => fireEvent.click(screen.getByRole("button", { name: "Gérer les cookies" })));
    expect(document.cookie).not.toContain("horkos_consentement");
    fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
    expect(document.cookie).toContain("horkos_consentement=oui");
    expect(screen.queryByRole("region", { name: "Préférences de cookies" })).toBeNull();
  });
});
