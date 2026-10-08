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
    <div className="group flex flex-col h-full">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-ink flex items-end p-8">
        {guide.cover_url ? (
          <Image
            src={guide.cover_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
          />
        ) : (
          <>
            <span aria-hidden="true" className="absolute -right-6 -top-10 font-heading font-light text-[16rem] leading-none text-navy">H</span>
            <span className="relative font-heading font-light text-cream text-[30px] leading-[1.1] tracking-[-0.02em]">
              {guide.cover_label ?? guide.title}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-col flex-1 pt-6">
        {guide.partner && (
          <p className="text-[14px] text-warm-grey mb-2">
            Avec {guide.partner}
          </p>
        )}
        <h2 className="font-heading text-[24px] text-ink leading-[1.15]">
          {guide.title}
        </h2>
        {guide.description && (
          <p className="text-[15px] text-warm-grey leading-relaxed mt-2">{guide.description}</p>
        )}

        <div className="mt-auto pt-5">
          {done ? (
            <p className="text-[15px] text-ink">{state.message}</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="btn btn-outline btn-sm"
              >
                {open ? "Fermer" : "Recevoir le guide"}
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
                      className="field h-11 flex-1 min-w-0"
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      className="btn btn-ink btn-sm h-11"
                    >
                      {pending ? "..." : "Envoyer"}
                    </button>
                  </form>
                  {state.status === "error" && (
                    <p className="text-[12.5px] text-red-600 pt-2">{state.message}</p>
                  )}
                  <p className="text-[13px] text-warm-grey pt-2">
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
