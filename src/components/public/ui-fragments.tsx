import { Check, FileText, CalendarDays, Lock, Video } from "lucide-react";
import { PARCOURS } from "@/lib/parcours";

/**
 * Fragments d'interface de l'espace client, dessinés pour les pages publiques.
 *
 * Ils montrent le produit au travail plutôt que de le décrire. Toutes les
 * données sont des exemples : aucun montant, aucune performance, et l'endroit
 * qui les affiche porte la mention « données d'illustration ».
 */

const card = "rounded-2xl bg-white ring-1 ring-ink/[0.07] shadow-[0_24px_48px_-24px_rgba(11,26,46,0.35)]";

export function FragJalons({ current = 1, className = "" }: { current?: number; className?: string }) {
  return (
    <div className={`${card} p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink">Votre accompagnement</p>
        <span className="text-[12px] text-warm-grey">Étape {current + 1} sur 3</span>
      </div>
      <ol className="mt-4 space-y-3">
        {PARCOURS.map((e, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={e.type} className="flex items-center gap-3">
              <span
                className={`grid place-items-center size-7 shrink-0 rounded-full text-[11px] font-semibold ${
                  done ? "bg-ink text-white" : now ? "bg-white text-ink ring-2 ring-ink" : "bg-cream-deep text-warm-grey"
                }`}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : e.type}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[13.5px] ${i > current ? "text-warm-grey" : "text-ink"}`}>{e.title}</span>
              </span>
              {now && <span className="text-[11.5px] font-medium text-ink">En cours</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function FragReco({ className = "" }: { className?: string }) {
  return (
    <div className={`${card} p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-warm-grey">Structuration</span>
        <span className="text-[12px] font-medium text-ink">À étudier</span>
      </div>
      <p className="mt-4 font-heading text-[19px] leading-snug text-ink">
        Apporter le bien locatif à une SARL immobilière
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-warm-grey">
        Pourquoi, ce que cela change, et ce que cela coûte : expliqué en trois points.
      </p>
    </div>
  );
}

export function FragDocument({ className = "" }: { className?: string }) {
  return (
    <div className={`${card} flex items-center gap-3.5 p-4 ${className}`}>
      <span className="grid place-items-center size-10 shrink-0 rounded-xl bg-cream-deep text-ink">
        <FileText className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-ink">Fiche d’audit patrimonial.pdf</span>
        <span className="block text-[12px] text-warm-grey">Déposé par votre conseiller</span>
      </span>
      <Lock className="size-4 text-warm-grey" aria-label="Coffre-fort chiffré" />
    </div>
  );
}

export function FragRdv({ className = "" }: { className?: string }) {
  return (
    <div className={`${card} p-4 ${className}`}>
      <div className="flex items-center gap-3.5">
        <span className="grid place-items-center size-10 shrink-0 rounded-xl bg-ink text-white">
          <CalendarDays className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] text-warm-grey">Prochain rendez-vous</span>
          <span className="block text-[13.5px] font-medium text-ink">R1 · Stratégie - jeudi, 10 h</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-charcoal">
          <Video className="size-3.5" aria-hidden="true" /> Visio
        </span>
      </div>
    </div>
  );
}

export function FragQuestionnaire({ className = "" }: { className?: string }) {
  const options = [
    { label: "Préparer ma retraite", on: true },
    { label: "Transmettre à mes enfants", on: true },
    { label: "Diversifier mes investissements", on: false },
    { label: "Optimiser ma fiscalité", on: false },
  ];
  return (
    <div className={`${card} p-5 ${className}`}>
      <p className="text-[12px] text-warm-grey">Questionnaire de bienvenue · 1 / 6</p>
      <p className="mt-2 font-heading text-[20px] leading-snug text-ink">Qu’aimeriez-vous accomplir ?</p>
      <ul className="mt-4 space-y-2">
        {options.map((o) => (
          <li key={o.label} className="flex items-center gap-2.5 text-[13px] text-ink">
            <span
              className={`grid size-4 place-items-center rounded-[3px] ${o.on ? "bg-ink text-white" : "ring-1 ring-ink/25"}`}
            >
              {o.on && <Check className="size-3" aria-hidden="true" />}
            </span>
            {o.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FragRevue({ className = "" }: { className?: string }) {
  const points = ["Répartition revue avec vous", "Arbitrages proposés et expliqués", "Documents mis à jour au coffre"];
  return (
    <div className={`${card} p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink">Revue périodique</p>
        <span className="text-[12px] text-warm-grey">Gouvernance</span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2.5 text-[13.5px] text-ink">
            <span className="grid place-items-center size-5 rounded-full bg-cream-deep">
              <Check className="size-3 text-ink" aria-hidden="true" />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
