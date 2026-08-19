import { AnimateIn } from "@/components/ui/animate-in";

export function AdminPanel({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-8">{children}</div>;
}

export function AdminHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-7">
      <AnimateIn variant="fade-up">
        <h1 className="font-heading text-[26px] font-semibold text-ink leading-[1.2]">{title}</h1>
        {desc && (
          <p className="text-[13.5px] text-warm-grey leading-[1.6] mt-1.5 max-w-[680px]">{desc}</p>
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
    <div className={`bg-white border border-cream-deep rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function AdminKpi({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <AdminCard className="p-5">
      <div className="text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey">
        {label}
      </div>
      <div className="font-heading text-[26px] font-semibold text-ink mt-2 leading-none">
        {value}
      </div>
      {note && <div className="text-[11.5px] text-warm-grey mt-2">{note}</div>}
    </AdminCard>
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
        <p className="text-[13.5px] text-warm-grey leading-[1.65] max-w-[440px] mx-auto">{empty}</p>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-cream-deep">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-5 py-3 text-[11px] font-semibold tracking-[1.2px] uppercase text-warm-grey whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-deep">{children}</tbody>
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
  return <td className={`px-5 py-3.5 text-[13px] text-charcoal align-top ${className}`}>{children}</td>;
}

const TONES: Record<string, string> = {
  neutre: "bg-cream-deep text-charcoal",
  attente: "bg-bronze/12 text-bronze-dark",
  succes: "bg-emerald-50 text-emerald-700",
  refus: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
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
      className={`inline-block shrink-0 text-[10.5px] font-semibold tracking-[1.1px] uppercase px-2.5 py-1 rounded whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
