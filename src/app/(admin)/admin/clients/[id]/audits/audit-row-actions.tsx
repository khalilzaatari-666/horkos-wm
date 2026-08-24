"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AuditForm, type AuditInitial } from "./audit-form";
import { updateAudit, setAuditStatus, deleteAudit } from "./actions";

export function AuditRowActions({
  clientId,
  audit,
}: {
  clientId: string;
  audit: AuditInitial & { id: string };
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
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

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
      >
        Modifier
      </button>

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

      {editing && (
        <AdminModal title="Modifier l'audit" onClose={() => setEditing(false)}>
          <AuditForm
            clientId={clientId}
            action={updateAudit}
            initial={audit}
            onCancel={() => setEditing(false)}
            onSuccess={() => {
              setEditing(false);
              router.refresh();
            }}
          />
        </AdminModal>
      )}
    </div>
  );
}
