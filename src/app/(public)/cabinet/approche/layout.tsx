import type { Metadata } from "next";

// The page is a client component (GSAP) and cannot export metadata itself.
export const metadata: Metadata = {
  title: "Notre approche",
  description: "Comprendre, structurer, décider avec clarté : les cinq principes qui guident chaque accompagnement Horkos, du premier échange au suivi dans la durée.",
  alternates: { canonical: "/cabinet/approche" },
  openGraph: {
    title: "Notre approche | Horkos WM",
    description: "Comprendre, structurer, décider avec clarté : les cinq principes qui guident chaque accompagnement Horkos, du premier échange au suivi dans la durée.",
    url: "/cabinet/approche",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
