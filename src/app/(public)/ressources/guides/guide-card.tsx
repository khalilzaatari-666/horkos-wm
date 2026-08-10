"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { requestGuide, type GuideRequestState } from "./actions";
import type { Guide } from "@/lib/content";

const initialState: GuideRequestState = { status: "idle" };

export function GuideCard({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(requestGuide, initialState);
  const done = state.status === "success";

  return (
    <div className="flex flex-col h-full bg-white border border-cream-deep rounded-lg overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className="relative aspect-[4/3] bg-ink flex items-center justify-center px-6">
        {guide.cover_url ? (
          <Image
            src={guide.cover_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <span className="font-heading text-cream text-[19px] leading-[1.35] text-center">
            {guide.cover_label ?? guide.title}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-6">
        {guide.partner && (
          <div className="text-bronze-dark text-[11px] font-semibold tracking-[1.3px] uppercase mb-2">
            {guide.partner}
          </div>
        )}
        <h2 className="font-heading text-[17px] font-semibold text-ink leading-[1.35]">
          {guide.title}
        </h2>
        {guide.description && (
          <p className="text-[13px] text-warm-grey leading-[1.6] mt-2">{guide.description}</p>
        )}

        <div className="mt-auto pt-5">
          {done ? (
            <p className="text-[13px] text-green-700 font-medium">{state.message}</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="text-bronze text-[13px] font-medium hover:text-bronze-dark transition-colors cursor-pointer"
              >
                Recevoir le guide {open ? "↑" : "→"}
              </button>

              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <form action={formAction} className="pt-3 flex gap-2">
                    <input type="hidden" name="guideId" value={guide.id} />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="Votre adresse email"
                      aria-label="Votre adresse email"
                      className="flex-1 min-w-0 h-10 px-3 text-[13px] bg-cream border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      className="h-10 px-4 text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      {pending ? "..." : "Envoyer"}
                    </button>
                  </form>
                  {state.status === "error" && (
                    <p className="text-[12.5px] text-red-600 pt-2">{state.message}</p>
                  )}
                  <p className="text-[11.5px] text-warm-grey pt-2">
                    Envoyé par email, aucune inscription requise.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
