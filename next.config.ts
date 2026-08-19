import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
