import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/public/page-hero";
import { EmptyState } from "@/components/public/empty-state";
import { CtaBand } from "@/components/public/cta-band";
import { AnimateIn } from "@/components/ui/animate-in";
import { getEvents, formatEventDay, isUpcoming } from "@/lib/content";

export const metadata: Metadata = {
  title: "Nos événements | Horkos Wealth Management",
  description: "Ateliers et rencontres organisés avec notre réseau de professionnels.",
};

export const revalidate = 300;

export default async function EvenementsPage() {
  const events = await getEvents();

  return (
    <>
      <PageHero
        tag="Événements"
        image="/images/pages/evenements-hero.jpg"
        title="Nous rencontrer, en petit comité."
        subtitle="Ateliers et rencontres organisés avec notre réseau de professionnels."
      />

      <section className="pb-12 lg:pb-16">
        <div className="shell">
          {events.length === 0 ? (
            <EmptyState
              title="Aucun événement programmé"
              desc="Nos prochains ateliers et rencontres seront annoncés ici. Prenez rendez-vous pour être informé en priorité."
            />
          ) : (
            <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event, i) => {
                const { day, month } = formatEventDay(event.date);
                const upcoming = isUpcoming(event.date);

                return (
                  <li key={event.id} className={upcoming ? "" : "opacity-60"}>
                    <AnimateIn variant="fade-up" delay={(i % 3) * 80}>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-cream-deep">
                        <Image
                          src={event.cover_url ?? "/images/pages/evenement-defaut.jpg"}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                          className="object-cover"
                        />
                        <div className="absolute left-4 top-4 rounded-2xl bg-white px-4 py-3 text-center">
                          <div className="font-heading text-[28px] leading-none text-ink">{day}</div>
                          <div className="mt-1 text-[13px] text-warm-grey">{month}</div>
                        </div>
                      </div>
                      <p className="mt-5 text-[14px] text-warm-grey">{upcoming ? "À venir" : "Passé"}</p>
                      <h2 className="mt-1 font-heading text-[24px] leading-[1.15] text-ink">{event.title}</h2>
                      {event.location && <p className="mt-2 text-[15px] text-ink">{event.location}</p>}
                      {event.description && (
                        <p className="mt-1 text-[15px] leading-relaxed text-warm-grey">{event.description}</p>
                      )}
                    </AnimateIn>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <CtaBand title="Être informé de nos prochains événements" label="Rester en contact" />
    </>
  );
}
