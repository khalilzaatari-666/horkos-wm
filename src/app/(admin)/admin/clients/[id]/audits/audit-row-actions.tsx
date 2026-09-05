"use client";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { type AuditInitial } from "./audit-form";
import { setAuditStatus, deleteAudit } from "./actions";

export function AuditRowActions({
  clientId,
  audit,
}: {
  clientId: string;
  audit: AuditInitial & { id: string };
}) {
  const next = audit.status === "termine" ? "en_cours" : "termine";

  return (
    <div className="flex items-center gap-3 justify-end whitespace-nowrap">
      <form action={setAuditStatus}>
        <input type="hidden" name="id" value={audit.id} />
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="status" value={next} />
        <button
          type="submit"
          className="text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
        >
          {next === "termine" ? "Marquer terminé" : "Rouvrir"}
        </button>
      </form>

      <form action={deleteAudit}>
        <input type="hidden" name="id" value={audit.id} />
        <input type="hidden" name="clientId" value={clientId} />
        <ConfirmButton
          message="Supprimer cet audit et son rapport ?"
          className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
        >
          Supprimer
        </ConfirmButton>
      </form>
    </div>
  );
}
