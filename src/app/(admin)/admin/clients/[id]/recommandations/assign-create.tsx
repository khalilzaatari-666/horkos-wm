"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { AssignForm } from "./assign-form";

export function AssignCreate({
  clientId,
  options,
}: {
  clientId: string;
  options: { id: string; title: string; category: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 inline-flex items-center text-[14px] font-medium bg-ink text-white rounded-[6px] hover:bg-navy transition-colors cursor-pointer"
      >
        Proposer une recommandation
      </button>
      {open && (
        <AdminModal title="Proposer une recommandation" onClose={() => setOpen(false)}>
          <AssignForm
            clientId={clientId}
            options={options}
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
