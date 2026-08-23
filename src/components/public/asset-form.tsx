"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { DEFAULT_ISO, getCountry, nationalLengths } from "@/lib/countries";
import {
  composePhone,
  validateEmail,
  validatePhoneNational,
  EMAIL_MAX,
  NAME_MAX,
} from "@/lib/validation";
import {
  assetGroups,
  cessionReasonOptions,
  DESCRIPTION_MAX,
  HORIZON_MAX,
} from "@/lib/asset-options";
import { submitAsset, type AssetState } from "@/app/(public)/cabinet/produits/actions";

const initialState: AssetState = { status: "idle" };

const fieldClass =
  "w-full h-11 px-3.5 text-[14px] bg-white border rounded-lg outline-none transition-colors";
const okBorder = "border-cream-deep focus:border-bronze";
const errBorder = "border-red-500 focus:border-red-500";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[12.5px] font-medium text-ink mb-1.5">
      {children}
      <span className="text-bronze ml-0.5" aria-hidden="true">
        *
      </span>
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[12px] text-red-600 mt-1.5 leading-[1.45]">
      {message}
    </p>
  );
}

/**
 * Carte du formulaire, ou rien en mode `bare` - l'espace client fournit alors la
 * sienne, pour que le formulaire s'accorde à ses autres panneaux sans que la
 * page publique ne change d'apparence.
 *
 * Déclarée ici et non dans le rendu : un composant recréé à chaque rendu
 * démonte tout son sous-arbre, et le champ en cours de saisie perdrait le focus
 * à chaque frappe.
 */
function Shell({ bare, children }: { bare: boolean; children: React.ReactNode }) {
  if (bare) return <>{children}</>;
  return <div className="bg-white rounded-lg p-7 shadow-sm">{children}</div>;
}

export interface AssetFormDefaults {
  contactName?: string;
  contactEmail?: string;
  /** Numéro national, sans indicatif : c'est ce que le champ attend. */
  phone?: string;
  phoneIso?: string;
}

/**
 * Le même formulaire sert au visiteur anonyme sur `/cabinet/produits` et au
 * client connecté sur `/espace/ceder`, où ses coordonnées sont pré-remplies.
 * Deux copies divergeraient - c'est déjà arrivé avec les listes de besoins.
 */
export function AssetForm({
  defaults,
  /** Rend le formulaire nu : ni carte ni titre, l'appelant s'en charge. */
  bare = false,
}: { defaults?: AssetFormDefaults; bare?: boolean } = {}) {
  const [state, formAction, pending] = useActionState(submitAsset, initialState);

  const [contactName, setContactName] = useState(defaults?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(defaults?.contactEmail ?? "");
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [phoneIso, setPhoneIso] = useState(defaults?.phoneIso ?? DEFAULT_ISO);
  const [assetType, setAssetType] = useState("");
  const [reason, setReason] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = {
    assetType: assetType ? null : "Sélectionnez un type d'actif.",
    reason: reason ? null : "Sélectionnez un motif.",
    contactName:
      contactName.trim().length >= 2 ? null : "Indiquez votre nom ou celui de la société.",
    contactEmail: validateEmail(contactEmail),
    phone: validatePhoneNational(phone, nationalLengths(phoneIso)),
    estimatedValue:
      Number(estimatedValue) > 0 ? null : "Indiquez une valeur estimée supérieure à zéro.",
  };
  const valid = Object.values(errors).every((e) => e === null);

  const shown = (f: keyof typeof errors) => (touched[f] ? errors[f] ?? undefined : undefined);
  const mark = (f: keyof typeof errors) =>
    setTouched((t) => (t[f] ? t : { ...t, [f]: true }));

  if (state.status === "success") {
    return (
      <Shell bare={bare}>
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-9 h-9 rounded-full bg-bronze/15 text-bronze-dark flex items-center justify-center shrink-0">
            <Check className="w-4.5 h-4.5" />
          </span>
          <h4 className="font-heading text-[19px] font-semibold text-ink leading-tight">
            Dossier bien reçu
          </h4>
        </div>
        <p className="text-[13.5px] text-warm-grey leading-[1.65]">
          Notre équipe étudie votre actif et revient vers vous sous 48 heures ouvrées. Rien
          n&apos;est présenté à un client sans votre accord préalable.
        </p>
      </Shell>
    );
  }

  return (
    <Shell bare={bare}>
      {!bare && <h4 className="text-[16px] font-semibold mb-1.5">Formulaire de soumission</h4>}
      <p className="text-[12.5px] text-warm-grey mb-5">
        Les champs suivis de <span className="text-bronze font-semibold">*</span> sont
        obligatoires.
      </p>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="contactPhone" value={composePhone(getCountry(phoneIso).dial, phone)} />

        <div>
          <Label htmlFor="assetType">Type d&apos;actif à céder</Label>
          <select
            id="assetType"
            name="assetType"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            onBlur={() => mark("assetType")}
            aria-invalid={shown("assetType") ? true : undefined}
            aria-describedby={shown("assetType") ? "assetType-error" : undefined}
            className={`${fieldClass} ${shown("assetType") ? errBorder : okBorder}`}
          >
            <option value="" disabled>
              Sélectionnez un type
            </option>
            {assetGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <FieldError id="assetType-error" message={shown("assetType")} />
        </div>

        <div>
          <Label htmlFor="reason">Motif de la cession</Label>
          <select
            id="reason"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => mark("reason")}
            aria-invalid={shown("reason") ? true : undefined}
            aria-describedby={shown("reason") ? "reason-error" : undefined}
            className={`${fieldClass} ${shown("reason") ? errBorder : okBorder}`}
          >
            <option value="" disabled>
              Sélectionnez un motif
            </option>
            {cessionReasonOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError id="reason-error" message={shown("reason")} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            {/* Companies submit too, so this one isn't letters-only. */}
            <Label htmlFor="contactName">Nom / Société</Label>
            <input
              id="contactName"
              name="contactName"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              onBlur={() => mark("contactName")}
              maxLength={NAME_MAX + 60}
              autoComplete="name"
              placeholder="Votre nom ou société"
              aria-invalid={shown("contactName") ? true : undefined}
              aria-describedby={shown("contactName") ? "contactName-error" : undefined}
              className={`${fieldClass} ${shown("contactName") ? errBorder : okBorder}`}
            />
            <FieldError id="contactName-error" message={shown("contactName")} />
          </div>

          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <PhoneInput
              id="phone"
              iso={phoneIso}
              onIsoChange={setPhoneIso}
              value={phone}
              onChange={setPhone}
              onBlur={() => mark("phone")}
              error={shown("phone")}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="contactEmail">Email</Label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            inputMode="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            onBlur={() => mark("contactEmail")}
            maxLength={EMAIL_MAX}
            autoComplete="email"
            placeholder="votre@email.com"
            aria-invalid={shown("contactEmail") ? true : undefined}
            aria-describedby={shown("contactEmail") ? "contactEmail-error" : undefined}
            className={`${fieldClass} ${shown("contactEmail") ? errBorder : okBorder}`}
          />
          <FieldError id="contactEmail-error" message={shown("contactEmail")} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="estimatedValue">Valeur estimée (MAD)</Label>
            <input
              id="estimatedValue"
              name="estimatedValue"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              onBlur={() => mark("estimatedValue")}
              placeholder="Ex: 5000000"
              aria-invalid={shown("estimatedValue") ? true : undefined}
              aria-describedby={shown("estimatedValue") ? "estimatedValue-error" : undefined}
              className={`${fieldClass} ${shown("estimatedValue") ? errBorder : okBorder}`}
            />
            <FieldError id="estimatedValue-error" message={shown("estimatedValue")} />
          </div>

          <div>
            <label htmlFor="horizon" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Horizon souhaité
              <span className="text-warm-grey font-normal"> (facultatif)</span>
            </label>
            <input
              id="horizon"
              name="horizon"
              maxLength={HORIZON_MAX}
              placeholder="Ex: 6 mois"
              className={`${fieldClass} ${okBorder}`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-[12.5px] font-medium text-ink mb-1.5">
            Description de l&apos;actif
            <span className="text-warm-grey font-normal"> (facultatif)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={DESCRIPTION_MAX}
            placeholder="Décrivez l'actif que vous souhaitez céder..."
            className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors resize-y"
          />
        </div>

        {state.status === "error" && (
          <p className="text-[13px] text-red-600">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={pending || !valid}
          className="w-full bg-bronze text-white h-11 font-medium text-[13.5px] tracking-[0.2px] hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg cursor-pointer"
        >
          {pending ? "Envoi..." : "Soumettre mon dossier"}
        </button>

        {!valid && (
          <p className="text-[12px] text-warm-grey">
            Renseignez les champs obligatoires pour envoyer votre dossier.
          </p>
        )}

        <p className="text-[11.5px] text-warm-grey leading-[1.5]">
          Vos informations restent confidentielles. Aucun actif n&apos;est présenté à un client
          sans votre accord préalable.
        </p>
      </form>
    </Shell>
  );
}
