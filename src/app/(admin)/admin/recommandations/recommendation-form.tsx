"use client";

import { useActionState, useEffect, useState } from "react";
import type { ActionState } from "@/lib/staff";
import type { RecommandationDetails } from "@/lib/recommandation-details";

const initialState: ActionState = { status: "idle" };

const field =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";
const area =
  "w-full px-3 py-2.5 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors leading-[1.6] resize-y";
const small =
  "flex-1 h-9 px-2.5 text-[13px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

export interface RecommendationInitial {
  id?: string;
  title: string;
  category: string;
  description: string;
  is_active: boolean;
  details: RecommandationDetails;
}

const EMPTY: RecommendationInitial = {
  title: "",
  category: "",
  description: "",
  is_active: true,
  details: {},
};

type Fonc = { titre: string; texte: string };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-warm-grey mb-1.5 mt-1">
      {children}
    </div>
  );
}

export function RecommendationForm({
  action,
  initial = EMPTY,
  onCancel,
  onSuccess,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: RecommendationInitial;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const [resume, setResume] = useState(initial.details.resume ?? "");
  const [frais, setFrais] = useState(initial.details.frais ?? "");
  const [pourquoi, setPourquoi] = useState<string[]>(initial.details.pourquoi ?? []);
  const [attention, setAttention] = useState<string[]>(initial.details.points_attention ?? []);
  const [fonc, setFonc] = useState<Fonc[]>(initial.details.fonctionnement ?? []);

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state, onSuccess]);

  const details = {
    ...(resume.trim() ? { resume: resume.trim() } : {}),
    ...(pourquoi.map((p) => p.trim()).filter(Boolean).length
      ? { pourquoi: pourquoi.map((p) => p.trim()).filter(Boolean) }
      : {}),
    ...(fonc.filter((f) => f.titre.trim() && f.texte.trim()).length
      ? { fonctionnement: fonc.filter((f) => f.titre.trim() && f.texte.trim()) }
      : {}),
    ...(attention.map((p) => p.trim()).filter(Boolean).length
      ? { points_attention: attention.map((p) => p.trim()).filter(Boolean) }
      : {}),
    ...(frais.trim() ? { frais: frais.trim() } : {}),
  };

  return (
    <form action={formAction} className="space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="details" value={JSON.stringify(details)} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="title" className="block text-[12px] font-medium text-ink mb-1.5">
            Titre
          </label>
          <input id="title" name="title" required maxLength={160} defaultValue={initial.title} className={field} />
        </div>
        <div>
          <label htmlFor="category" className="block text-[12px] font-medium text-ink mb-1.5">
            Catégorie
          </label>
          <input
            id="category"
            name="category"
            required
            maxLength={80}
            defaultValue={initial.category}
            placeholder="Prévoyance, Fiscalité, Retraite…"
            className={field}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-[12px] font-medium text-ink mb-1.5">
          Description courte <span className="text-warm-grey font-normal">(liste)</span>
        </label>
        <textarea id="description" name="description" rows={2} maxLength={1000} defaultValue={initial.description} className={area} />
      </div>

      <div className="border-t border-cream-deep pt-3">
        <p className="text-[12px] text-warm-grey mb-2">
          Contenu détaillé de la fiche (facultatif) — chaque section vide est simplement ignorée.
        </p>

        <SectionLabel>Résumé</SectionLabel>
        <textarea rows={2} value={resume} onChange={(e) => setResume(e.target.value)} className={area} />

        <SectionLabel>Pourquoi cette recommandation</SectionLabel>
        <ListEditor items={pourquoi} setItems={setPourquoi} placeholder="Un argument…" addLabel="Ajouter un point" inputClass={small} />

        <SectionLabel>Comment ça fonctionne</SectionLabel>
        <div className="space-y-2">
          {fonc.map((f, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                <input
                  value={f.titre}
                  onChange={(e) => setFonc(fonc.map((x, j) => (j === i ? { ...x, titre: e.target.value } : x)))}
                  placeholder="Titre de l'étape"
                  className={`${small} w-full`}
                />
                <textarea
                  rows={2}
                  value={f.texte}
                  onChange={(e) => setFonc(fonc.map((x, j) => (j === i ? { ...x, texte: e.target.value } : x)))}
                  placeholder="Explication"
                  className={area}
                />
              </div>
              <button type="button" onClick={() => setFonc(fonc.filter((_, j) => j !== i))} className="mt-1 text-[16px] text-warm-grey hover:text-red-600 cursor-pointer" aria-label="Retirer">
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setFonc([...fonc, { titre: "", texte: "" }])} className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium cursor-pointer">
            + Ajouter une étape
          </button>
        </div>

        <SectionLabel>Points d&apos;attention</SectionLabel>
        <ListEditor items={attention} setItems={setAttention} placeholder="Un point de vigilance…" addLabel="Ajouter un point" inputClass={small} />

        <SectionLabel>Frais</SectionLabel>
        <textarea rows={2} value={frais} onChange={(e) => setFrais(e.target.value)} className={area} />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer border-t border-cream-deep pt-4">
        <input type="checkbox" name="is_active" defaultChecked={initial.is_active} className="w-4 h-4 accent-bronze cursor-pointer" />
        <span className="text-[13px] text-ink">Active (proposable aux clients)</span>
      </label>

      {state.status === "error" && state.message && (
        <p className="text-[12.5px] text-red-600" aria-live="polite">{state.message}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className="h-10 px-5 text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onCancel} className="h-10 px-4 inline-flex items-center text-[13px] text-warm-grey hover:text-ink transition-colors cursor-pointer">
          Annuler
        </button>
      </div>
    </form>
  );
}

function ListEditor({
  items,
  setItems,
  placeholder,
  addLabel,
  inputClass,
}: {
  items: string[];
  setItems: (v: string[]) => void;
  placeholder: string;
  addLabel: string;
  inputClass: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={it}
            onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={placeholder}
            className={inputClass}
          />
          <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-[16px] text-warm-grey hover:text-red-600 cursor-pointer" aria-label="Retirer">
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setItems([...items, ""])} className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium cursor-pointer">
        + {addLabel}
      </button>
    </div>
  );
}
