"use client";

import Link from "next/link";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { type AuditInitial } from "./audit-form";
import { deleteAudit } from "./actions";

export function AuditRowActions({
  clientId,
  audit,
}: {
  clientId: string;
  audit: AuditInitial & { id: string };
}) {
  return (
    <div className="flex items-center gap-3 justify-end whitespace-nowrap">
      <Link
        href={`/admin/clients/${clientId}/audits/${audit.id}?modifier=1`}
        className="text-[12.5px] text-warm-grey hover:text-ink transition-colors"
      >
        Modifier
      </Link>

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
