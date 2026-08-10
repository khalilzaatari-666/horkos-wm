import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { EmptyState } from "@/components/public/empty-state";
import { AnimateIn } from "@/components/ui/animate-in";
import { getGuides } from "@/lib/content";
import { GuideCard } from "./guide-card";

export const metadata: Metadata = {
  title: "Nos guides | Horkos Wealth Management",
  description:
    "Des guides complets sur la structuration, la transmission et les actifs alternatifs, coécrits avec des institutions reconnues.",
};

export const revalidate = 300;

export default async function GuidesPage() {
  const guides = await getGuides();

  return (
    <>
      <PageHero
        tag="Nos guides"
        title="Des guides complets, coécrits avec des institutions reconnues."
        subtitle="Chaque guide est réalisé en partenariat avec un acteur reconnu de la place. Laissez votre email pour le recevoir directement."
      />

      <section className="py-14">
        <div className="max-w-[1200px] mx-auto px-7">
          {guides.length === 0 ? (
            <EmptyState
              title="Nos premiers guides arrivent"
              desc="Ils sont en cours de rédaction avec nos partenaires : experts-comptables, notaires et fonds d'investissement."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[22px]">
              {guides.map((guide, i) => (
                <AnimateIn key={guide.id} variant="reveal-up" delay={i * 110} className="h-full">
                  <GuideCard guide={guide} />
                </AnimateIn>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
