import type { Metadata } from "next";

// The page is a client component (GSAP) and cannot export metadata itself.
export const metadata: Metadata = {
  title: "Notre réseau de professionnels",
  description: "Sociétés de gestion, assureurs, agents immobiliers, fonds de Private Equity et de Venture Capital : le réseau qui alimente vos opportunités.",
  alternates: { canonical: "/conseil/reseau" },
  openGraph: {
    title: "Notre réseau de professionnels | Horkos WM",
    description: "Sociétés de gestion, assureurs, agents immobiliers, fonds de Private Equity et de Venture Capital : le réseau qui alimente vos opportunités.",
    url: "/conseil/reseau",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
