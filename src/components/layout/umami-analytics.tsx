import Script from "next/script";

/**
 * Script de tracking Umami (auto-hébergé). Monté dans les layouts (public) et
 * (client) uniquement - jamais dans (admin), pour ne pas mélanger le trafic
 * interne de l'équipe aux visites réelles comptées dans le tableau de bord.
 *
 * `data-do-not-track` fait respecter l'en-tête DNT du navigateur : Umami ne
 * dépose aucun cookie, mais c'est un geste à faible coût.
 */
export function UmamiAnalytics() {
  const src = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!src || !websiteId) return null;

  return (
    <Script
      src={src}
      data-website-id={websiteId}
      data-do-not-track="true"
      strategy="afterInteractive"
    />
  );
}
