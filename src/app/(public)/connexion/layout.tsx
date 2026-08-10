import type { Metadata } from "next";

// Auth pages carry no public value and shouldn't compete in search results.
export const metadata: Metadata = {
  title: "Connexion",
  description: "Accédez à votre espace client Horkos Wealth Management.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
