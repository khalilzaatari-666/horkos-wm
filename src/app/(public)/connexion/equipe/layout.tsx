import type { Metadata } from "next";

// Auth pages carry no public value and shouldn't compete in search results.
export const metadata: Metadata = {
  title: "Accès équipe",
  description: "Connexion réservée aux administrateurs et conseillers Horkos.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
