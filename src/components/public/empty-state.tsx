import { AnimateIn } from "@/components/ui/animate-in";

interface EmptyStateProps {
  title: string;
  desc: string;
}

/** Shown until the back-office publishes the first item of a section. */
export function EmptyState({ title, desc }: EmptyStateProps) {
  return (
    <AnimateIn variant="fade-up">
      <div className="panel px-7 py-16 text-center">
        <span className="text-[14px] text-warm-grey">Bientôt disponible</span>
        <h3 className="display-md mt-6 text-ink">{title}</h3>
        <p className="text-[16px] text-charcoal leading-relaxed max-w-[44ch] mx-auto mt-4">
          {desc}
        </p>
      </div>
    </AnimateIn>
  );
}
