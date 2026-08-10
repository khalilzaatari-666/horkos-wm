import { AnimateIn } from "@/components/ui/animate-in";

interface EmptyStateProps {
  title: string;
  desc: string;
}

/** Shown until the back-office publishes the first item of a section. */
export function EmptyState({ title, desc }: EmptyStateProps) {
  return (
    <AnimateIn variant="fade-up">
      <div className="border border-dashed border-cream-deep rounded-lg bg-cream/60 px-7 py-14 text-center">
        <span className="inline-block text-bronze-dark text-[11px] font-semibold tracking-[1.6px] uppercase mb-3">
          Bientôt disponible
        </span>
        <h3 className="font-heading text-[20px] font-semibold text-ink">{title}</h3>
        <p className="text-[13.5px] text-warm-grey leading-[1.65] max-w-[420px] mx-auto mt-2">
          {desc}
        </p>
      </div>
    </AnimateIn>
  );
}
