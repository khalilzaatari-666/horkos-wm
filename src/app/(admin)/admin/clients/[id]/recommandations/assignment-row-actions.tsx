"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminModal } from "@/components/admin/admin-modal";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AssignmentEditForm } from "./assignment-edit-form";
import { removeAssignment } from "./actions";

export function AssignmentRowActions({
  clientId,
  assignment,
}: {
  clientId: string;
  assignment: { id: string; status: string; notes: string; title: string };
}) {
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
      <form action={removeAssignment}>
        <input type="hidden" name="id" value={assignment.id} />
        <input type="hidden" name="clientId" value={clientId} />
        <ConfirmButton
          message={`Retirer « ${assignment.title} » de ce client ?`}
          className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
        >
          Retirer
        </ConfirmButton>
      </form>

      {editing && (
        <AdminModal title="Modifier la recommandation" onClose={() => setEditing(false)}>
          <AssignmentEditForm
            clientId={clientId}
            assignment={{ id: assignment.id, status: assignment.status, notes: assignment.notes }}
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
