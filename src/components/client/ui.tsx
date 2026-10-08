import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";

/**
 * En-tête de page de l'espace : le titre en grand, une phrase d'appui.
 * `eyebrow` reste accepté pour la compatibilité mais n'est plus affiché : le
 * titre porte seul la hiérarchie, et la barre latérale situe déjà la page.
 */
export function PanelHead({
  title,
  desc,
  action,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <AnimateIn variant="fade-up">
        <h1 className="display-md text-ink">{title}</h1>
        {desc && <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-charcoal">{desc}</p>}
      </AnimateIn>
      {action}
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
      className={`bg-white ring-1 ring-ink/[0.07] rounded-[20px] ${
        center ? "flex flex-col justify-center" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading text-[22px] font-light text-ink leading-[1.2] tracking-[-0.01em] mb-5">
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
    <div className="bg-white ring-1 ring-ink/[0.07] rounded-[20px] p-6">
      <div className="text-[14px] text-warm-grey">
        {label}
      </div>
      <div
        className={`font-heading font-light text-[34px] tracking-[-0.02em] mt-3 leading-none tabular-nums ${
          muted ? "text-warm-grey text-[15px] leading-[1.4]" : "text-ink"
        }`}
      >
        {value}
      </div>
      {note && <div className="text-[13px] text-warm-grey mt-3">{note}</div>}
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
    <div className="panel px-7 py-14 text-center">
      <h3 className="display-sm text-ink">{title}</h3>
      <p className="text-[16px] text-charcoal leading-relaxed max-w-[46ch] mx-auto mt-3">{desc}</p>
      {action && (
        <Link
          href={action.href}
          className="btn btn-ink btn-sm mt-6"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  neutre: "text-charcoal before:bg-warm-grey",
  attente: "text-ink before:bg-bronze",
  succes: "text-emerald-700 before:bg-emerald-600",
  refus: "text-red-700 before:bg-red-600",
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
      className={`inline-flex items-center gap-1.5 shrink-0 text-[13px] font-medium before:size-1.5 before:rounded-full before:content-[''] ${STATUS_STYLES[tone]}`}
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
      className={`mx-auto px-5 sm:px-10 py-10 sm:py-14 ${narrow ? "max-w-[1080px]" : "max-w-[1440px]"}`}
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
      className={`grid gap-4 auto-rows-fr ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}
