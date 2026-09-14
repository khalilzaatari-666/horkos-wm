import type { NextConfig } from "next";

/**
 * next/image n'autorise que les hôtes déclarés. Les couvertures d'articles et de
 * guides vivent dans le bucket public `media` de Supabase : on dérive son hôte de
 * l'URL du projet plutôt que de coder un domaine en dur (il change d'un
 * environnement à l'autre).
 */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

/** Origine du script Umami (projet Vercel séparé), à autoriser dans la CSP. */
const umamiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ?? "").origin;
  } catch {
    return null;
  }
})();

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy statique (sans nonce).
 *
 * Un nonce par requête serait plus strict, mais il force le rendu dynamique de
 * toutes les pages - le site public perdrait son cache statique/ISR. On garde
 * donc `'unsafe-inline'` pour les scripts (ceux d'hydratation de Next sont
 * inline) ; la politique bloque déjà tout script chargé depuis un hôte tiers,
 * l'encadrement par iframe et les formulaires postés vers l'extérieur.
 *
 * Hôtes autorisés : Supabase (auth, REST, storage) et Umami, dérivés des
 * variables d'environnement, jamais codés en dur.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${umamiOrigin ? ` ${umamiOrigin}` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabaseHost ? ` https://${supabaseHost}` : ""}`,
  "font-src 'self' data:",
  `connect-src 'self'${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""}${umamiOrigin ? ` ${umamiOrigin}` : ""}${isDev ? " ws:" : " https://vercel.live"}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  typescript: {
    /**
     * Le typage N'EST PAS désactivé : il est simplement sorti du build.
     * `npm run build` lance `tsc --noEmit` d'abord et s'arrête à la moindre
     * erreur — voir le script dans package.json.
     *
     * Pourquoi : Next vérifie les types dans un worker qui n'hérite pas de
     * NODE_OPTIONS. Passé une certaine taille de projet il épuise sa mémoire
     * (« Zone Allocation failed »), et aucune valeur de --max-old-space-size,
     * même 8 Go, ne l'atteint. Le même contrôle lancé directement par tsc passe
     * en une dizaine de secondes pour ~410 Mo.
     *
     * Conséquence à connaître : `next build` invoqué seul ne vérifie plus rien.
     * Toujours passer par `npm run build`.
     */
    ignoreBuildErrors: true,
  },
  /**
   * L'export PDF de la fiche d'audit lit les polices du cabinet sur le disque à
   * l'exécution. Elles ne font partie d'aucun import : sans cette déclaration,
   * le traceur de fichiers ne les embarque pas dans la fonction déployée et
   * l'export échoue en production, jamais en local.
   */
  outputFileTracingIncludes: {
    "/admin/clients/[id]/audits/[auditId]/export/pdf": ["./docs/fonts/*.ttf"],
    "/espace/patrimoine/audit/[auditId]/pdf": ["./docs/fonts/*.ttf"],
  },
  async redirects() {
    return [
      // The mockup called this route /questionnaire; the site standardised on
      // /rendez-vous. Kept so old links and bookmarks don't 404.
      { source: "/questionnaire", destination: "/rendez-vous", permanent: true },
    ];
  },
};

export default nextConfig;
