"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { AuditForm } from "./audit-form";
import { createAudit } from "./actions";

export function AuditCreate({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

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
