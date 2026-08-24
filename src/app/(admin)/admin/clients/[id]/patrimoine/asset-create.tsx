"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { AssetForm } from "./asset-form";
import { createAsset } from "./actions";

export function AssetCreate({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 inline-flex items-center text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors cursor-pointer"
      >
        Ajouter un actif
      </button>
      {open && (
        <AdminModal title="Ajouter un actif" onClose={() => setOpen(false)}>
          <AssetForm
            clientId={clientId}
            action={createAsset}
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
