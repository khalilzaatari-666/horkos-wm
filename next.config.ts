import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The mockup called this route /questionnaire; the site standardised on
      // /rendez-vous. Kept so old links and bookmarks don't 404.
      { source: "/questionnaire", destination: "/rendez-vous", permanent: true },
    ];
  },
};

export default nextConfig;
