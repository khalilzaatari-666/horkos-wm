import type { Metadata } from "next";

// The page is a client component (GSAP) and cannot export metadata itself.
export const metadata: Metadata = {
  title: "Structuration patrimoniale",
  description: "Création de sociétés patrimoniales, apport de biens en nature, gestion comptable déléguée, avec les professionnels de notre réseau au Maroc.",
  alternates: { canonical: "/conseil/structuration" },
  openGraph: {
    title: "Structuration patrimoniale | Horkos WM",
    description: "Création de sociétés patrimoniales, apport de biens en nature, gestion comptable déléguée, avec les professionnels de notre réseau au Maroc.",
    url: "/conseil/structuration",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
