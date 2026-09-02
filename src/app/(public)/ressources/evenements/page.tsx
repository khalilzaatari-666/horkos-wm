import type { Metadata } from "next";
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
        tag="Nos événements"
        title="Nous rencontrer, en petit comité."
        subtitle="Ateliers et rencontres organisés avec notre réseau de professionnels."
      />

      <section className="py-14">
        <div className="max-w-[1200px] mx-auto px-7">
          {events.length === 0 ? (
            <EmptyState
              title="Aucun événement programmé"
              desc="Nos prochains ateliers et rencontres seront annoncés ici. Prenez rendez-vous pour être informé en priorité."
            />
          ) : (
            <div>
              {events.map((event, i) => {
                const { day, month } = formatEventDay(event.date);
                const upcoming = isUpcoming(event.date);

                return (
                  <AnimateIn key={event.id} variant="fade-up" mobileVariant="fade-left" delay={i * 80}>
                    <div
                      className={`flex items-start gap-5 py-6 border-t border-cream-deep last:border-b ${
                        upcoming ? "" : "opacity-65"
                      }`}
                    >
                      <div className="shrink-0 w-[66px] text-center bg-cream-deep rounded-lg py-2.5">
                        <div className="font-heading text-[24px] font-medium text-ink leading-none">
                          {day}
                        </div>
                        <div className="text-[11px] text-warm-grey uppercase tracking-[1px] mt-1">
                          {month}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h2 className="font-heading text-[19px] font-semibold text-ink leading-[1.35]">
                          {event.title}
                        </h2>
                        {(event.description || event.location) && (
                          <p className="text-[13px] text-warm-grey leading-[1.6] mt-1">
                            {[event.location, event.description].filter(Boolean).join(" - ")}
                          </p>
                        )}
                      </div>

                      <span
                        className={`shrink-0 text-[10.5px] font-semibold tracking-[1.2px] uppercase px-2.5 py-1 rounded ${
                          upcoming
                            ? "bg-bronze/15 text-bronze-dark"
                            : "bg-ink/[0.06] text-warm-grey"
                        }`}
                      >
                        {upcoming ? "À venir" : "Passé"}
                      </span>
                    </div>
                  </AnimateIn>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <CtaBand title="Être informé de nos prochains événements" label="Rester en contact" />
    </>
  );
}
