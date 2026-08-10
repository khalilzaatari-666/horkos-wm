import type { Metadata } from "next";

// The page is a client component (GSAP) and cannot export metadata itself.
export const metadata: Metadata = {
  title: "Notre modèle et nos frais",
  description: "Comment Horkos est rémunéré. Premier rendez-vous gratuit, aucun frais caché, jamais deux catégories de frais à la fois.",
  alternates: { canonical: "/cabinet/modele" },
  openGraph: {
    title: "Notre modèle et nos frais | Horkos WM",
    description: "Comment Horkos est rémunéré. Premier rendez-vous gratuit, aucun frais caché, jamais deux catégories de frais à la fois.",
    url: "/cabinet/modele",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
