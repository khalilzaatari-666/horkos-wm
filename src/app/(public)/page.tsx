import type { Metadata } from "next";
import { HomeContent } from "./home-content";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// The page itself is a client component (GSAP), which cannot export metadata,
// and the homepage shares its layout with every other public page. Hence this
// thin server wrapper.
export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} | Conseil en gestion de patrimoine au Maroc`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomeContent />;
}
