"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { GuideForm } from "./guide-form";
import { createGuide } from "./actions";

/** Bouton « Nouveau guide » : ouvre le formulaire de création en modale. */
export function GuideCreate({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 inline-flex items-center text-[14px] font-medium bg-ink text-white rounded-[6px] hover:bg-navy transition-colors cursor-pointer"
      >
        Nouveau guide
      </button>
      {open && (
        <AdminModal title="Nouveau guide" onClose={() => setOpen(false)}>
          <GuideForm
            action={createGuide}
            categories={categories}
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
