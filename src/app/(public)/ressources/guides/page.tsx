import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { EmptyState } from "@/components/public/empty-state";
import { AnimateIn } from "@/components/ui/animate-in";
import { getGuides, getCategories, filtrerParCategorie } from "@/lib/content";
import { FiltreCategories } from "@/components/public/filtre-categories";
import { GuideCard } from "./guide-card";
import { CtaBand } from "@/components/public/cta-band";

export const metadata: Metadata = {
  title: "Nos guides | Horkos Wealth Management",
  description:
    "Des guides complets sur la structuration, la transmission et les actifs alternatifs, coécrits avec des institutions reconnues.",
};

export const revalidate = 300;

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string | string[] }>;
}) {
  const [guides, ordre, { categorie }] = await Promise.all([
    getGuides(),
    getCategories("guides"),
    searchParams,
  ]);
  const { categories, active, visibles } = filtrerParCategorie(
    guides,
    ordre,
    categorie,
  );

  return (
    <>
      <PageHero
        tag="Guides"
        image="/images/pages/guides-hero.jpg"
        title="Des guides complets, coécrits avec des institutions reconnues."
        subtitle={
          "Chaque guide est réalisé en partenariat avec un acteur reconnu de la place.\nLaissez votre email pour le recevoir directement."
        }
      />

      <section className="pb-12 lg:pb-16">
        <div className="shell">
          {guides.length === 0 ? (
            <EmptyState
              title="Nos premiers guides arrivent"
              desc="Ils sont en cours de rédaction avec nos partenaires : experts-comptables, notaires et fonds d’investissement."
            />
          ) : (
            <>
              <FiltreCategories
                base="/ressources/guides"
                categories={categories}
                active={active}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
                {visibles.map((guide, i) => (
                  <AnimateIn
                    key={guide.id}
                    variant="reveal-up"
                    delay={i * 110}
                    className="h-full"
                  >
                    <GuideCard guide={guide} />
                  </AnimateIn>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <CtaBand title="Un guide ne remplace pas un échange." label="Prendre rendez-vous" />
    </>
  );
}
