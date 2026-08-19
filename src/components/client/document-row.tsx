"use client";

import { useActionState, useEffect, useRef } from "react";
import { getDocumentUrl, type DownloadState } from "@/app/(client)/espace/coffre/actions";

const initialState: DownloadState = { status: "idle" };

/** « 1,4 Mo ». Nul ou absent, on n'affiche rien plutôt que « 0 o ». */
function formatSize(bytes: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/**
 * Une ligne du coffre-fort.
 *
 * L'URL n'existe pas au rendu : elle est demandée au clic, signée pour une
 * minute, puis ouverte. Un lien posé dans le HTML resterait valide dans
 * l'historique du navigateur et dans les journaux du proxy, ce qui n'est pas
 * acceptable pour une pièce patrimoniale.
 */
export function DocumentRow({
  id,
  name,
  size,
  date,
}: {
  id: string;
  name: string;
  size: number | null;
  date: string;
}) {
  const [state, formAction, pending] = useActionState(getDocumentUrl, initialState);
  const opened = useRef<string | undefined>(undefined);

  useEffect(() => {
    // `opened` évite de rouvrir l'onglet si le composant se re-rend avec le
    // même état après l'ouverture.
    if (state.status !== "ready" || !state.url || opened.current === state.url) return;
    opened.current = state.url;
    window.open(state.url, "_blank", "noopener,noreferrer");
  }, [state]);

  const weight = formatSize(size);

  return (
    <div className="flex flex-col h-full p-4 bg-white border border-cream-deep rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:border-bronze/40">
      <span
        aria-hidden="true"
        className="grid place-items-center w-9 h-9 rounded-lg bg-cream text-bronze-dark shrink-0 mb-3"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
        </svg>
      </span>

      {/* `flex-1` pousse le bouton en bas : dans une grille, des intitulés de
          longueurs inégales décaleraient sinon les boutons d'une carte à l'autre. */}
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium text-ink leading-[1.4]">{name}</div>
        <div className="text-[11.5px] text-warm-grey mt-1">
          {date}
          {weight ? ` · ${weight}` : ""}
        </div>
        {state.status === "error" && (
          <p className="text-[11.5px] text-red-600 mt-1.5 leading-[1.45]">{state.message}</p>
        )}
      </div>

      <form action={formAction} className="mt-4">
        <input type="hidden" name="documentId" value={id} />
        <button
          type="submit"
          disabled={pending}
          className="w-full px-3.5 py-2 text-[12.5px] font-medium text-bronze-dark border border-cream-deep rounded-lg hover:border-bronze hover:bg-cream transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          {pending ? "Ouverture…" : "Ouvrir"}
        </button>
      </form>
    </div>
  );
}
