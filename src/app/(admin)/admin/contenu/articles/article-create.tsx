"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { ArticleForm } from "./article-form";
import { createArticle } from "./actions";

/** Bouton « Nouvel article » : ouvre le formulaire de création en modale. */
export function ArticleCreate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 inline-flex items-center text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors cursor-pointer"
      >
        Nouvel article
      </button>
      {open && (
        <AdminModal title="Nouvel article" onClose={() => setOpen(false)}>
          <ArticleForm
            action={createArticle}
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
