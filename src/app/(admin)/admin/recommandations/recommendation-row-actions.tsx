"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { RecommendationForm, type RecommendationInitial } from "./recommendation-form";
import { updateRecommendation, toggleRecommendationActive, deleteRecommendation } from "./actions";

export function RecommendationRowActions({ reco }: { reco: RecommendationInitial & { id: string } }) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 justify-end whitespace-nowrap">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium transition-colors cursor-pointer"
      >
        Modifier
      </button>

      <form action={toggleRecommendationActive}>
        <input type="hidden" name="id" value={reco.id} />
        <input type="hidden" name="active" value={reco.is_active ? "false" : "true"} />
        <button
          type="submit"
          className="text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
        >
          {reco.is_active ? "Désactiver" : "Activer"}
        </button>
      </form>

      <form action={deleteRecommendation}>
        <input type="hidden" name="id" value={reco.id} />
        <ConfirmButton
          message={`Supprimer « ${reco.title} » ? (si elle a déjà été proposée à des clients, elle sera seulement désactivée)`}
          className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
        >
          Supprimer
        </ConfirmButton>
      </form>

      {editing && (
        <AdminModal title="Modifier la recommandation" onClose={() => setEditing(false)}>
          <RecommendationForm
            action={updateRecommendation}
            initial={reco}
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
