import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";

export function AdminPanel({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[1500px] mx-auto px-5 sm:px-10 py-10">{children}</div>;
}

export function AdminHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-9">
      <AnimateIn variant="fade-up">
        <h1 className="display-md text-ink">{title}</h1>
        {desc && (
          <p className="text-[15px] text-charcoal leading-relaxed mt-2.5 max-w-[680px]">{desc}</p>
        )}
      </AnimateIn>
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white ring-1 ring-ink/[0.07] rounded-[20px] ${className}`}>
      {children}
    </div>
  );
}

/**
 * Une vignette de chiffre-clé.
 *
 * `href` la rend cliquable vers la section concernée ; `emphasis` teinte la
 * valeur en bronze pour signaler « il y a quelque chose à traiter » sans qu'un
 * œil ait à lire l'intitulé.
 */
export function AdminKpi({
  label,
  value,
  note,
  href,
  emphasis = false,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
  emphasis?: boolean;
}) {
  const card = (
    <AdminCard
      className={`p-6 h-full ${href ? "transition-shadow hover:ring-ink/25" : ""}`}
    >
      <div className="text-[14px] text-warm-grey">{label}</div>
      <div
        className={`font-heading font-light text-[34px] tracking-[-0.02em] mt-3 leading-none tabular-nums ${
          emphasis ? "text-ink" : "text-ink"
        }`}
      >
        {value}
      </div>
      {note && <div className="text-[13px] text-warm-grey mt-3">{note}</div>}
    </AdminCard>
  );

  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

/**
 * Tableau du back-office.
 *
 * `overflow-x-auto` sur l'enveloppe et non sur la page : un tableau large doit
 * défiler dans son cadre, jamais faire déborder toute la mise en page.
 */
export function AdminTable({
  headers,
  children,
  empty,
  isEmpty,
}: {
  /** `ReactNode` et non `string` : un en-tête peut porter un lien de tri. */
  headers: React.ReactNode[];
  children: React.ReactNode;
  empty: string;
  isEmpty: boolean;
}) {
  if (isEmpty) {
    return (
      <AdminCard className="p-10 text-center">
        <p className="text-[15px] text-warm-grey leading-relaxed max-w-[440px] mx-auto">{empty}</p>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-ink/[0.08] bg-ink/[0.02]">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-5 py-3.5 text-[13px] font-medium text-warm-grey whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.06]">{children}</tbody>
        </table>
      </div>
    </AdminCard>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-5 py-4 text-[14px] text-charcoal align-top ${className}`}>{children}</td>;
}

const TONES: Record<string, string> = {
  neutre: "text-charcoal before:bg-warm-grey",
  attente: "text-ink before:bg-bronze",
  succes: "text-emerald-700 before:bg-emerald-600",
  refus: "text-red-700 before:bg-red-600",
  info: "text-blue-700 before:bg-blue-600",
};

export function AdminBadge({
  children,
  tone = "neutre",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 shrink-0 text-[13px] font-medium whitespace-nowrap before:size-1.5 before:rounded-full before:content-[''] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
