import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";

interface PageHeroProps {
  tag: string;
  title: string;
  subtitle: string;
}

/** The ink header every inner page opens with. */
export function PageHero({ tag, title, subtitle }: PageHeroProps) {
  return (
    <section className="bg-ink text-cream pt-[50px] pb-[36px] overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-7">
        <AnimateIn variant="blur-in" duration={0.5}>
          <span className="inline-block bg-cream/[0.08] border border-cream/[0.18] text-bronze-light text-[11px] font-semibold tracking-[1.5px] uppercase px-3.5 py-1.5 mb-4">
            {tag}
          </span>
        </AnimateIn>
        <SplitHeading
          text={title}
          className="text-[clamp(1.8rem,4.3vw,2.2rem)] font-medium text-cream max-w-[660px] leading-[1.3]"
          delay={200}
        />
        <AnimateIn variant="fade-up" delay={400}>
          <p className="text-[#D8CDBC] max-w-[620px] mt-3.5 text-[16px] leading-[1.7]">
            {subtitle}
          </p>
        </AnimateIn>
      </div>
    </section>
  );
}
