import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { UmamiAnalytics } from "@/components/layout/umami-analytics";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { OrganisationJsonLd } from "@/components/public/structured-data";
import { ScrollRefresh } from "@/components/ui/scroll-refresh";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Colonne d'au moins une hauteur d'écran : `main` s'étire (flex-1) et pousse
    // le footer tout en bas, même quand la page est plus courte que l'écran.
    <div className="min-h-screen flex flex-col">
      <UmamiAnalytics />
      <OrganisationJsonLd />
      <ScrollRefresh />
      <Header />
      {/* `main` remplit l'espace entre header et footer ; `my-auto` centre le
          contenu verticalement quand il reste de la place, et se réduit à zéro
          quand la page est plus haute que l'écran (alignée en haut, défilement
          normal, jamais de contenu rogné). */}
      <main className="flex-1 flex flex-col page-transition">
        <div className="my-auto w-full">{children}</div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
