"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { EventForm } from "./event-form";
import { createEvent } from "./actions";

/** Bouton « Nouvel événement » : ouvre le formulaire de création en modale. */
export function EventCreate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 inline-flex items-center text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors cursor-pointer"
      >
        Nouvel événement
      </button>
      {open && (
        <AdminModal title="Nouvel événement" onClose={() => setOpen(false)}>
          <EventForm
            action={createEvent}
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
