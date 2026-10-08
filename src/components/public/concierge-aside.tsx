import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import { CABINET_EMAIL, CABINET_PHONE, CABINET_PHONE_HREF } from "@/lib/site";

const SUITE = [
  { title: "Nous lisons votre demande", desc: "Nous la lisons attentivement et revenons vers vous rapidement." },
  { title: "Un premier échange", desc: "Gratuit et sans engagement, en visio ou au cabinet à Casablanca." },
  { title: "Vous décidez de la suite", desc: "Aucune recommandation avant d’avoir compris votre situation." },
];

/**
 * Le panneau qui accompagne les formulaires de prise de contact : qui lira la
 * demande, comment le joindre autrement, et ce qui se passe ensuite.
 */
export function ConciergeAside() {
  return (
    <aside className="lg:sticky lg:top-28 overflow-hidden rounded-[28px] bg-ink p-8 text-cream sm:p-10">
      <div className="flex items-center gap-4">
        <Image
          src="/images/fondateur.jpg"
          alt=""
          width={128}
          height={128}
          className="size-16 rounded-full object-cover object-[50%_12%] ring-2 ring-cream/20"
        />
        <div>
          <p className="text-[17px] text-cream">Othmane Benzakour</p>
          <p className="text-[14px] text-cream-muted">Fondateur, votre interlocuteur</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <a href={CABINET_PHONE_HREF} className="flex items-center gap-3 text-[16px] tabular-nums hover:text-white transition-colors">
          <Phone className="size-4 text-cream-muted" aria-hidden="true" /> {CABINET_PHONE}
        </a>
        <a href={`mailto:${CABINET_EMAIL}`} className="flex items-center gap-3 text-[16px] hover:text-white transition-colors">
          <Mail className="size-4 text-cream-muted" aria-hidden="true" /> {CABINET_EMAIL}
        </a>
      </div>

      <h2 className="mt-10 border-t border-cream/12 pt-8 font-sans text-[14px] font-normal tracking-normal text-cream-muted">
        Ce qui se passe ensuite
      </h2>
      <ol className="mt-5 space-y-6">
        {SUITE.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-3">
            <span className="grid size-7 place-items-center rounded-full ring-1 ring-cream/25 text-[13px] text-cream">
              {i + 1}
            </span>
            <div>
              <p className="text-[16px] text-cream">{s.title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-cream-muted">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
