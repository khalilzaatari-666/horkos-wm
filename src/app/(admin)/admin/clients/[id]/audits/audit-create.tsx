"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { AuditForm } from "./audit-form";
import { createAudit } from "./actions";

export function AuditCreate({
  clientId,
  peutOuvrir,
  prochainAuditLe,
}: {
  clientId: string;
  /** Faux tant que le dernier audit a moins d'un an - cadence annuelle. */
  peutOuvrir: boolean;
  /** Date lisible à laquelle le prochain audit devient possible, si `peutOuvrir` est faux. */
  prochainAuditLe: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!peutOuvrir) {
    return (
      <div className="text-right">
        <button
          type="button"
          disabled
          title={
            prochainAuditLe
              ? `Prochain audit possible le ${prochainAuditLe} (cadence annuelle)`
              : undefined
          }
          className="h-10 px-5 inline-flex items-center text-[13px] font-medium bg-bronze text-white rounded-lg opacity-40 cursor-not-allowed"
        >
          Ouvrir un audit
        </button>
        {prochainAuditLe && (
          <p className="text-[11.5px] text-warm-grey mt-1.5">
            Prochain audit possible le {prochainAuditLe}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 inline-flex items-center text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors cursor-pointer"
      >
        Ouvrir un audit
      </button>
      {open && (
        <AdminModal title="Ouvrir un audit" onClose={() => setOpen(false)}>
          <AuditForm
            clientId={clientId}
            action={createAudit}
            onCancel={() => setOpen(false)}
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </AdminModal>
      )}
    </>
  );
}
