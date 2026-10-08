import Link from "next/link";
import Image from "next/image";
import { Phone } from "lucide-react";
import { AnimateIn } from "@/components/ui/animate-in";
import { CABINET_PHONE, CABINET_PHONE_HREF } from "@/lib/site";

interface CtaBandProps {
  title: string;
  label: string;
  href?: string;
  text?: string;
}

/** Arcs concentriques au trait, l'arc du riad : la seule ornementation de la clôture. */
function Arches() {
  const arcs = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const w = 260 + i * 150;
    const r = w / 2;
    const x1 = 600 - r;
    const x2 = 600 + r;
    const top = 640 - w * 1.05;
    return `M${x1} 640 V${top + r} A${r} ${r} 0 0 1 ${x2} ${top + r} V640`;
  });
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 640"
      className="pointer-events-none absolute bottom-0 left-1/2 w-[1400px] max-w-none -translate-x-1/2"
      fill="none"
    >
      {arcs.map((d) => (
        <path key={d} d={d} stroke="rgb(248 244 236 / 0.09)" strokeWidth="1" />
      ))}
    </svg>
  );
}

/**
 * La clôture de chaque page publique : un chapitre encre pleine largeur,
 * l'invitation au centre, les deux façons d'y répondre, et le nom de celui
 * qu'on rencontrera.
 */
export function CtaBand({
  title,
  label,
  href = "/rendez-vous",
  text = "Un premier échange, gratuit et sans engagement, en visio ou au cabinet, pour comprendre votre situation avant toute recommandation.",
}: CtaBandProps) {
  return (
    <section className="relative overflow-hidden border-t border-cream/10 bg-ink text-cream">
      <Arches />
      <div className="shell relative py-24 text-center lg:py-32">
        <AnimateIn variant="fade-up">
          <h2 className="display-lg mx-auto max-w-[18ch] text-cream">{title}</h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-[17px] leading-relaxed text-cream-muted">{text}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href={href} className="btn btn-bronze">
              {label}
            </Link>
            <a href={CABINET_PHONE_HREF} className="btn btn-ghost-light tabular-nums">
              <Phone className="size-4" aria-hidden="true" />
              {CABINET_PHONE}
            </a>
          </div>
          <p className="mt-10 inline-flex items-center gap-3 text-[14px] text-cream-muted">
            <Image
              src="/images/fondateur.jpg"
              alt=""
              width={72}
              height={72}
              className="size-9 rounded-full object-cover object-[50%_12%]"
            />
            <span>
              Vous parlerez directement avec <span className="text-cream">Othmane Benzakour</span>, fondateur.
            </span>
          </p>
        </AnimateIn>
      </div>
    </section>
  );
}
