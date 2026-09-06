"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { FaqForm } from "./faq-form";
import { createFaq } from "./actions";

/** Bouton « Nouvelle question » : ouvre le formulaire de création en modale. */
export function FaqCreate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 inline-flex items-center text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors cursor-pointer"
      >
        Nouvelle question
      </button>
      {open && (
        <AdminModal title="Nouvelle question" onClose={() => setOpen(false)}>
          <FaqForm
            action={createFaq}
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
