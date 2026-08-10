import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { OrganisationJsonLd } from "@/components/public/structured-data";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OrganisationJsonLd />
      <Header />
      <main className="flex-1 page-transition">{children}</main>
      <Footer />
    </>
  );
}
