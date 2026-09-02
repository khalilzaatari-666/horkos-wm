"use client";

import { useActionState, useState } from "react";
import { inviteStaff, type InviteState } from "./actions";
import { INVITABLE_ROLES, ROLE_LABELS } from "./constants";
import { AdminCard } from "@/components/admin/ui";
import { formatNameInput, NAME_MAX, EMAIL_MAX } from "@/lib/validation";

const initialState: InviteState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

/**
 * Invitation d'un membre de l'équipe. Supabase crée le compte et envoie le lien
 * de définition du mot de passe ; ensuite, connexion sur `/connexion/equipe`.
 */
export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteStaff, initialState);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  return (
    <AdminCard className="p-6 mb-5">
      <h2 className="font-heading text-[17.5px] font-semibold text-ink mb-1.5">
        Inviter un membre de l&apos;équipe
      </h2>
      <p className="text-[12.5px] text-warm-grey leading-[1.6] mb-4 max-w-[620px]">
        La personne reçoit un email avec un lien pour définir son mot de passe. Elle se connectera
        ensuite sur la page de connexion équipe.
      </p>

      <form action={formAction} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label htmlFor="firstName" className="block text-[12px] font-medium text-ink mb-1.5">
            Prénom
          </label>
          <input
            id="firstName"
            name="firstName"
            required
            maxLength={NAME_MAX}
            value={firstName}
            onChange={(e) => setFirstName(formatNameInput(e.target.value))}
            autoComplete="off"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-[12px] font-medium text-ink mb-1.5">
            Nom
          </label>
          <input
            id="lastName"
            name="lastName"
            required
            maxLength={NAME_MAX}
            value={lastName}
            onChange={(e) => setLastName(formatNameInput(e.target.value))}
            autoComplete="off"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="inviteEmail" className="block text-[12px] font-medium text-ink mb-1.5">
            Email
          </label>
          <input
            id="inviteEmail"
            name="email"
            type="email"
            required
            maxLength={EMAIL_MAX}
            placeholder="prenom@horkos-wm.com"
            autoComplete="off"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="inviteRole" className="block text-[12px] font-medium text-ink mb-1.5">
            Rôle
          </label>
          <select id="inviteRole" name="role" defaultValue="conseiller" className={`${field} cursor-pointer`}>
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="h-10 px-5 text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {pending ? "Envoi…" : "Envoyer l'invitation"}
        </button>
      </form>

      {state.status !== "idle" && state.message && (
        <p
          className={`text-[12.5px] leading-[1.5] mt-3 ${
            state.status === "success" ? "text-emerald-700" : "text-red-600"
          }`}
          aria-live="polite"
        >
          {state.message}
        </p>
      )}
    </AdminCard>
  );
}
