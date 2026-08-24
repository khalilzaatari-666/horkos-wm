"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AssetForm, type AssetInitial } from "./asset-form";
import { ValuationForm } from "./valuation-form";
import { updateAsset, deleteAsset } from "./actions";

export function AssetRowActions({
  clientId,
  asset,
}: {
  clientId: string;
  asset: AssetInitial & { id: string };
}) {
  const [mode, setMode] = useState<null | "edit" | "valorise">(null);
  const router = useRouter();
  const close = () => setMode(null);
  const success = () => {
    setMode(null);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 justify-end whitespace-nowrap">
      <button
        type="button"
        onClick={() => setMode("valorise")}
        className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium transition-colors cursor-pointer"
      >
        Valoriser
      </button>
      <button
        type="button"
        onClick={() => setMode("edit")}
        className="text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
      >
        Modifier
      </button>
      <form action={deleteAsset}>
        <input type="hidden" name="id" value={asset.id} />
        <input type="hidden" name="clientId" value={clientId} />
        <ConfirmButton
          message={`Supprimer l'actif « ${asset.label} » et son historique ?`}
          className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
        >
          Supprimer
        </ConfirmButton>
      </form>

      {mode === "edit" && (
        <AdminModal title="Modifier l'actif" onClose={close}>
          <AssetForm
            clientId={clientId}
            action={updateAsset}
            initial={asset}
            onCancel={close}
            onSuccess={success}
          />
        </AdminModal>
      )}
      {mode === "valorise" && (
        <AdminModal title="Nouveau relevé de valeur" onClose={close}>
          <ValuationForm clientId={clientId} assetId={asset.id} onCancel={close} onSuccess={success} />
        </AdminModal>
      )}
    </div>
  );
}
