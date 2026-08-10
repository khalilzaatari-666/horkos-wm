import type { Metadata } from "next";

// The page is a client component (GSAP) and cannot export metadata itself.
export const metadata: Metadata = {
  title: "Nos cas d'usage",
  description: "Trois situations patrimoniales concrètes et les stratégies sur-mesure mises en place pour y répondre.",
  alternates: { canonical: "/conseil/cas-usage" },
  openGraph: {
    title: "Nos cas d'usage | Horkos WM",
    description: "Trois situations patrimoniales concrètes et les stratégies sur-mesure mises en place pour y répondre.",
    url: "/conseil/cas-usage",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
