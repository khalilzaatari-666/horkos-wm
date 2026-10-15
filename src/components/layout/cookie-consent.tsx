"use client";

import Link from "next/link";
import Script from "next/script";
import { useSyncExternalStore } from "react";

/**
 * Le choix du visiteur sur les cookies, et la mesure d'audience qui en dépend.
 * Montés dans les layouts (public) et (client) - jamais dans (admin), dont le
 * trafic interne ne doit pas se mêler aux visites réelles.
 *
 * Umami (auto-hébergé) ne dépose aucun cookie, mais ne se charge qu'après
 * « Accepter ». Le choix est gardé six mois dans un cookie lisible par le
 * navigateur ; « Gérer les cookies », en pied de page, le remet en question.
 */
const COOKIE = "horkos_consentement";
const EVENEMENT = "horkos:consentement";
const SIX_MOIS = 60 * 60 * 24 * 182;

type Choix = "oui" | "non" | "aucun";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENEMENT, onChange);
  return () => window.removeEventListener(EVENEMENT, onChange);
}

const getSnapshot = (): Choix =>
  (document.cookie.match(/(?:^|; )horkos_consentement=(oui|non)/)?.[1] as Choix | undefined) ?? "aucun";

/** Côté serveur, le choix est inconnu : rien ne s'affiche avant l'hydratation. */
const getServerSnapshot = (): Choix | null => null;

/** Umami chargé dans cette page : une fois là, seul un rechargement l'arrête. */
let mesureChargee = false;

function choisir(choix: Choix) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    choix === "aucun"
      ? `${COOKIE}=; Max-Age=0; Path=/`
      : `${COOKIE}=${choix}; Max-Age=${SIX_MOIS}; Path=/; SameSite=Lax${secure}`;
  if (choix === "non" && mesureChargee) location.reload();
  else window.dispatchEvent(new Event(EVENEMENT));
}

export function CookieConsent() {
  const choix = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const src = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  if (choix === "oui" && src && websiteId) {
    return (
      <Script
        src={src}
        data-website-id={websiteId}
        data-do-not-track="true"
        strategy="afterInteractive"
        onLoad={() => (mesureChargee = true)}
      />
    );
  }
  if (choix !== "aucun") return null;

  return (
    <section
      aria-label="Préférences de cookies"
      className="fixed inset-x-4 bottom-4 z-50 rounded-[20px] bg-white p-5 text-[14px] leading-relaxed text-charcoal shadow-[0_24px_60px_-28px_rgba(11,26,46,0.45)] ring-1 ring-ink/10 sm:inset-x-auto sm:left-5 sm:bottom-5 sm:max-w-[400px] sm:p-6"
    >
      <p className="font-heading text-[18px] text-ink">Cookies et mesure d’audience</p>
      <p className="mt-2">
        Nous utilisons les cookies nécessaires au fonctionnement du site et, avec votre accord, une
        mesure d’audience anonyme pour l’améliorer.{" "}
        <Link href="/politique-de-confidentialite" className="text-ink underline underline-offset-2 hover:text-ink/70">
          En savoir plus
        </Link>
      </p>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => choisir("non")} className="btn btn-outline btn-sm flex-1">
          Refuser
        </button>
        <button type="button" onClick={() => choisir("oui")} className="btn btn-ink btn-sm flex-1">
          Accepter
        </button>
      </div>
    </section>
  );
}

/** Rouvre le bandeau, pour changer d'avis. */
export function GererCookies({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => choisir("aucun")} className={className}>
      Gérer les cookies
    </button>
  );
}
