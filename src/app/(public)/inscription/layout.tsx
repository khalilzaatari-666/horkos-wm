import type { Metadata } from "next";

// Auth pages carry no public value and shouldn't compete in search results.
export const metadata: Metadata = {
  title: "Créer votre espace client",
  description: "Activez votre espace client Horkos pour suivre votre dossier et vos documents.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
