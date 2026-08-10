import type { Metadata } from "next";

// The page is a client component (GSAP) and cannot export metadata itself.
export const metadata: Metadata = {
  title: "Nos produits et solutions",
  description: "Placements financiers, immobilier, private equity, venture capital et art. Chaque solution est choisie pour votre situation, jamais l'inverse.",
  alternates: { canonical: "/cabinet/produits" },
  openGraph: {
    title: "Nos produits et solutions | Horkos WM",
    description: "Placements financiers, immobilier, private equity, venture capital et art. Chaque solution est choisie pour votre situation, jamais l'inverse.",
    url: "/cabinet/produits",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
