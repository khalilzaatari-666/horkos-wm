import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";

/** En-tête de section : intitulé bronze, titre, sous-titre facultatif. */
export function PanelHead({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-7">
      <AnimateIn variant="fade-right" mobileVariant="fade-up">
        <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
          {eyebrow}
        </span>
      </AnimateIn>
      <AnimateIn variant="fade-up" delay={80}>
        <h1 className="font-heading text-[clamp(1.5rem,3.2vw,1.8rem)] font-semibold text-ink mt-2 leading-[1.25]">
          {title}
        </h1>
        {desc && (
          <p className="text-[13.5px] text-warm-grey leading-[1.65] mt-2 max-w-[620px]">{desc}</p>
        )}
      </AnimateIn>
    </div>
  );
}

/**
 * Carte blanche standard de l'espace.
 *
 * `center` répartit l'espace excédentaire au-dessus et au-dessous du contenu.
 * Dans une rangée, toutes les cartes prennent la hauteur de la plus haute ;
 * sans ça, les plus courtes laissent tout leur vide en bas et paraissent
 * décrochées. À réserver aux cartes de texte : celles qui épinglent un montant
 * ou un bouton en bas alignent volontairement cet élément d'une carte à l'autre.
 */
export function Card({
  children,
  center = false,
  className = "",
}: {
  children: React.ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-cream-deep rounded-xl shadow-sm ${
        center ? "flex flex-col justify-center" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading text-[16px] font-semibold text-ink leading-[1.3] mb-4">
      {children}
    </h2>
  );
}

/**
 * Indicateur du tableau de bord.
 *
 * `value` reste une chaîne déjà formatée : c'est `@/lib/patrimoine` qui décide
 * comment se lit un montant, pas la carte qui l'affiche.
 */
export function Kpi({
  label,
  value,
  note,
  muted = false,
}: {
  label: string;
  value: string;
  note?: string;
  muted?: boolean;
}) {
  return (
    <div className="bg-white border border-cream-deep rounded-xl shadow-sm p-5">
      <div className="text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey">
        {label}
      </div>
      <div
        className={`font-heading text-[26px] font-semibold mt-2 leading-none ${
          muted ? "text-warm-grey text-[15px] leading-[1.4]" : "text-ink"
        }`}
      >
        {value}
      </div>
      {note && <div className="text-[11.5px] text-warm-grey mt-2">{note}</div>}
    </div>
  );
}

/**
 * État vide de l'espace client.
 *
 * `EmptyState` du site public annonce « Bientôt disponible », ce qui n'a pas de
 * sens ici : la section n'est pas à venir, c'est le conseiller qui n'a pas
 * encore déposé la pièce. Le ton est donc différent, et l'action possible
 * nommée explicitement plutôt que laissée à deviner.
 */
export function EmptyPanel({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="border border-dashed border-cream-deep rounded-xl bg-cream/50 px-7 py-12 text-center">
      <h3 className="font-heading text-[17px] font-semibold text-ink">{title}</h3>
      <p className="text-[13px] text-warm-grey leading-[1.65] max-w-[400px] mx-auto mt-2">{desc}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-block mt-5 px-5 py-2.5 text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  neutre: "bg-cream-deep text-charcoal",
  attente: "bg-bronze/12 text-bronze-dark",
  succes: "bg-emerald-50 text-emerald-700",
  refus: "bg-red-50 text-red-700",
};

export function Badge({
  children,
  tone = "neutre",
}: {
  children: React.ReactNode;
  tone?: keyof typeof STATUS_STYLES;
}) {
  return (
    <span
      className={`inline-block shrink-0 text-[10.5px] font-semibold tracking-[1.1px] uppercase px-2.5 py-1 rounded ${STATUS_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Enveloppe commune de l'espace.
 *
 * Large : la barre latérale prend déjà 256 px, et un contenu bridé à 980 px
 * laissait de larges bandes vides sur un écran d'ordinateur portable. La borne
 * haute existe quand même - au-delà, les grilles s'étirent au point que l'œil
 * ne relie plus une ligne à son en-tête.
 */
export function Panel({
  children,
  /**
   * Pour les pages dont le contenu ne remplit pas 1500 px - l'accompagnement et
   * ses quelques rendez-vous. Centrer sur une largeur plus courte vaut mieux
   * que de laisser des cartes s'aligner à gauche d'un canevas trop grand.
   */
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div
      className={`mx-auto px-5 sm:px-8 py-8 sm:py-10 ${narrow ? "max-w-[1080px]" : "max-w-[1500px]"}`}
    >
      {children}
    </div>
  );
}

/**
 * Grille de cartes, la disposition par défaut des collections de l'espace.
 *
 * `auto-rows-fr` : sans elle, une carte plus haute que ses voisines laisse les
 * autres flotter en haut de leur cellule, et la rangée paraît décousue.
 */
export function CardGrid({
  children,
  min = "280px",
  className = "",
}: {
  children: React.ReactNode;
  /** Largeur minimale d'une carte avant que la grille ne retire une colonne. */
  min?: string;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-3.5 auto-rows-fr ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}
