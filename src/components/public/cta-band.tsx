import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";

interface CtaBandProps {
  title: string;
  label: string;
  href?: string;
}

export function CtaBand({ title, label, href = "/rendez-vous" }: CtaBandProps) {
  return (
    <section className="py-16 bg-cream-deep border-t border-ink/[0.06]">
      <div className="max-w-[1200px] mx-auto px-7 text-center">
        <SplitHeading
          text={title}
          as="h2"
          className="text-[clamp(1.6rem,3.9vw,1.95rem)] font-semibold mb-6"
        />
        <AnimateIn variant="fade-up" delay={200}>
          <Link
            href={href}
            className="inline-block px-[26px] py-[13px] font-medium text-[13.5px] tracking-[0.2px] bg-bronze text-white hover:bg-bronze-dark transition-colors rounded-lg"
          >
            {label}
          </Link>
        </AnimateIn>
      </div>
    </section>
  );
}
