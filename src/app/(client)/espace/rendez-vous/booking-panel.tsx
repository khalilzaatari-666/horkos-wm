"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { CreneauPicker } from "@/components/booking/creneau-picker";
import { ModeSelector, type RdvMode } from "@/components/booking/mode-selector";
import { Card } from "@/components/client/ui";
import { bookEspaceSlot, type EspaceBookingState } from "./actions";

const initialState: EspaceBookingState = { status: "idle" };

const slotFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Casablanca",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Le même CreneauPicker que le questionnaire public, sans questionnaire :
 * l'utilisateur est connu, un seul écran choix → confirmation suffit.
 */
export function BookingPanel() {
  const [state, formAction, pending] = useActionState(bookEspaceSlot, initialState);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [mode, setMode] = useState<RdvMode | null>(null);
  const [noSlots, setNoSlots] = useState(false);

  if (state.status === "success" && state.bookedSlot) {
    const s = slotFmt.format(new Date(state.bookedSlot));
    return (
      <Card className="p-7">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-9 h-9 rounded-full bg-bronze/15 text-bronze-dark flex items-center justify-center shrink-0">
            <Check className="w-4.5 h-4.5" />
          </span>
          <h2 className="font-heading text-[19px] font-semibold text-ink leading-tight">
            Votre rendez-vous est confirmé
          </h2>
        </div>
        <p className="text-[15px] text-ink font-medium">
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </p>
        <p className="text-[13px] text-warm-grey leading-[1.65] mt-2">
          {state.bookedMode === "visio"
            ? "En visioconférence - le lien Google Meet et l'invitation calendrier vous arrivent par email."
            : "Au cabinet - l'adresse et l'invitation calendrier vous arrivent par email."}{" "}
          Un empêchement ? Prévenez votre conseiller, il vous proposera une autre heure.
        </p>
        <Link
          href="/espace/accompagnement"
          className="inline-block mt-5 px-5 py-2.5 text-[13px] font-medium bg-ink text-cream rounded-lg hover:bg-navy transition-colors"
        >
          Voir mon accompagnement
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-7">
      <div className="mb-5">
        <ModeSelector value={mode} onChange={setMode} />
      </div>
      <CreneauPicker
        onSelect={(slot, token) => {
          setSlotStart(slot);
          setHoldToken(token);
        }}
        onEmptyChange={setNoSlots}
      />

      {noSlots ? (
        <p className="text-[13px] text-warm-grey leading-[1.65] mt-4 pt-4 border-t border-cream-deep">
          Aucun créneau n&apos;est ouvert pour l&apos;instant. Contactez votre conseiller, il
          vous proposera une heure directement.
        </p>
      ) : (
        <form action={formAction} className="mt-5 pt-5 border-t border-cream-deep">
          {slotStart && holdToken && mode && (
            <>
              <input type="hidden" name="slotStart" value={slotStart} />
              <input type="hidden" name="holdToken" value={holdToken} />
              <input type="hidden" name="mode" value={mode} />
            </>
          )}

          {state.status === "error" && (
            <p className="text-[13px] text-red-600 mb-3">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={!slotStart || !mode || pending}
            className="w-full sm:w-auto px-7 py-3 text-[13.5px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {pending ? "Confirmation…" : "Confirmer ce rendez-vous"}
          </button>
          {(!slotStart || !mode) && (
            <p className="text-[12px] text-warm-grey mt-2.5">
              {!mode
                ? "Choisissez un format et un créneau pour confirmer."
                : "Choisissez un créneau pour confirmer."}
            </p>
          )}
        </form>
      )}
    </Card>
  );
}
