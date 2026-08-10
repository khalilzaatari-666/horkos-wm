import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // Lets every page express its canonical and social URLs as a plain path.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Conseil en gestion de patrimoine au Maroc`,
    template: "%s | Horkos WM",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Horkos Conseil" }],
  keywords: [
    "gestion de patrimoine Maroc",
    "conseil en investissement financier",
    "structuration patrimoniale",
    "société patrimoniale Maroc",
    "transmission patrimoine",
    "CIF Maroc",
    "MRE patrimoine",
  ],
  openGraph: {
    type: "website",
    locale: "fr_MA",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Conseil en gestion de patrimoine au Maroc`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/images/logo-dark.jpg", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/images/logo-dark.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: { icon: "/images/logo.png", apple: "/images/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${plusJakarta.variable} ${cormorant.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
