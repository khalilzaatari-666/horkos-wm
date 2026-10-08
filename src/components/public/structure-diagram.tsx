import { ArrowRight } from "lucide-react";

export interface StructureNode {
  label: string;
  sub?: string;
  /** `key` : l'entité qui change tout (la société créée). */
  tone?: "plain" | "key";
}

export interface StructureColumn {
  title: string;
  chain: StructureNode[];
  /** Les professionnels qui interviennent sur ce montage. */
  aside?: StructureNode[];
}

function Box({ node }: { node: StructureNode }) {
  return (
    <div
      className={`rounded-2xl px-5 py-4 ${
        node.tone === "key" ? "bg-ink text-cream" : "bg-white ring-1 ring-ink/10 text-ink"
      }`}
    >
      <p className="text-[16px] font-medium leading-snug">{node.label}</p>
      {node.sub && (
        <p className={`mt-0.5 text-[13.5px] ${node.tone === "key" ? "text-cream-muted" : "text-warm-grey"}`}>{node.sub}</p>
      )}
    </div>
  );
}

function Column({ col }: { col: StructureColumn }) {
  return (
    <div className="min-w-0">
      <p className="mb-4 text-[14px] text-warm-grey">{col.title}</p>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <ol className="flex flex-col items-stretch">
          {col.chain.map((n, i) => (
            <li key={n.label} className="flex flex-col items-stretch">
              {i > 0 && <span aria-hidden="true" className="mx-auto h-6 w-px bg-ink/25" />}
              <Box node={n} />
            </li>
          ))}
        </ol>
        {col.aside && col.aside.length > 0 && (
          <ul className="flex flex-col gap-2 sm:border-l sm:border-dashed sm:border-ink/25 sm:pl-4">
            {col.aside.map((a) => (
              <li key={a.label} className="text-[14px] text-ink">
                {a.label}
                {a.sub && <span className="text-warm-grey"> · {a.sub}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Un montage patrimonial avant et après, dessiné depuis ses données : qui
 * détient quoi, et quels professionnels interviennent.
 */
export function StructureDiagram({ before, after }: { before: StructureColumn; after: StructureColumn }) {
  return (
    <figure className="panel p-6 sm:p-10">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1.2fr)]">
        <Column col={before} />
        <span
          aria-hidden="true"
          className="mx-auto grid size-12 place-items-center rounded-full bg-white text-ink ring-1 ring-ink/10 rotate-90 lg:rotate-0"
        >
          <ArrowRight className="size-5" />
        </span>
        <Column col={after} />
      </div>
    </figure>
  );
}
