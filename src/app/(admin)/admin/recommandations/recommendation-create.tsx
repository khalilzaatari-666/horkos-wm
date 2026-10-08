"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { RecommendationForm } from "./recommendation-form";
import { createRecommendation } from "./actions";

export function RecommendationCreate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 inline-flex items-center text-[14px] font-medium bg-ink text-white rounded-[6px] hover:bg-navy transition-colors cursor-pointer"
      >
        Nouvelle recommandation
      </button>
      {open && (
        <AdminModal title="Nouvelle recommandation" onClose={() => setOpen(false)}>
          <RecommendationForm
            action={createRecommendation}
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
