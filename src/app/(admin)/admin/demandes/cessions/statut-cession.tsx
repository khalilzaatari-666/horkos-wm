"use client";

import { setCessionStatus } from "./actions";

const STATUTS = [
  { value: "soumis", label: "Soumis" },
  { value: "en_revue", label: "En revue" },
  { value: "accepte", label: "Accepté" },
  { value: "rejete", label: "Non retenu" },
];

const TEINTES: Record<string, string> = {
  accepte: "text-emerald-700 border-emerald-200 bg-emerald-50",
  rejete: "text-warm-grey border-cream-deep bg-cream/60",
};

/** Le statut d'un dossier de cession, modifiable sur place : il s'enregistre au choix. */
export function StatutCession({ id, statut }: { id: string; statut: string }) {
  return (
    <form action={setCessionStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={statut}
        aria-label="Statut du dossier"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`h-8 px-2.5 text-[12.5px] font-medium border rounded-lg outline-none focus:border-bronze cursor-pointer ${
          TEINTES[statut] ?? "text-bronze-dark border-bronze/30 bg-bronze/5"
        }`}
      >
        {STATUTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </form>
  );
}
