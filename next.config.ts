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

const nextConfig: NextConfig = {
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
  async redirects() {
    return [
      // The mockup called this route /questionnaire; the site standardised on
      // /rendez-vous. Kept so old links and bookmarks don't 404.
      { source: "/questionnaire", destination: "/rendez-vous", permanent: true },
    ];
  },
};

export default nextConfig;
