"use client";

import { useActionState, useRef } from "react";
import { updateUserRole, type RoleState } from "./actions";
import { ROLES, ROLE_LABELS, type Role } from "./constants";

const initialState: RoleState = { status: "idle" };

/**
 * Un rôle mal attribué ouvre l'accès aux données de tous les clients, donc le
 * changement demande une confirmation explicite plutôt que de partir au premier
 * changement de liste - contrairement au statut d'une demande, qui est anodin.
 */
export function RoleSelect({
  id,
  value,
  isSelf,
}: {
  id: string;
  value: string;
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateUserRole, initialState);
  const selectRef = useRef<HTMLSelectElement>(null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const next = selectRef.current?.value;
        if (next === value) {
          e.preventDefault();
          return;
        }
        const role = (next ?? "client") as Role;
        const label = ROLE_LABELS[role];
        // Prévenir de l'email : l'admin doit savoir que le compte va être
        // sollicité, pas le découvrir parce que la personne le rappelle.
        const suite =
          role === "client"
            ? ""
            : "\n\nUn email lui sera envoyé pour définir son mot de passe d'accès au back-office.";
        if (!confirm(`Attribuer le rôle « ${label} » à ce compte ?${suite}`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-2">
        <select
          ref={selectRef}
          name="role"
          defaultValue={value}
          disabled={pending || isSelf}
          aria-label="Rôle du compte"
          className="px-2.5 py-1.5 text-[12.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        {!isSelf && (
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 text-[12px] font-medium text-bronze-dark border border-cream-deep rounded-lg hover:border-bronze hover:bg-cream transition-colors cursor-pointer disabled:opacity-60"
          >
            {pending ? "…" : "Appliquer"}
          </button>
        )}
      </div>

      {isSelf && (
        <p className="text-[11px] text-warm-grey mt-1">Votre propre compte.</p>
      )}
      {state.status === "error" && (
        <p className="text-[11.5px] text-red-600 mt-1 leading-[1.45] max-w-[240px]">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p className="text-[11.5px] text-emerald-700 mt-1 leading-[1.45] max-w-[240px]">
          {state.message}
        </p>
      )}
    </form>
  );
}
