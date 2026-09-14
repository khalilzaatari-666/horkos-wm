"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { AnimateIn } from "@/components/ui/animate-in";
import { submitPartenariat, type PartenariatState } from "./actions";
import {
  partnerCategories,
  partnerCategoryLabels,
  gestionFondsOptions,
  assureurProduitOptions,
  ouiNonOptions,
  immoBienOptions,
  fondsLeveeOptions,
  fondsStadeOptions,
  clubNatureOptions,
  COMPANY_MAX,
  SHORT_TEXT_MAX,
  DETAIL_MAX,
  type PartnerCategory,
} from "@/lib/partenariat-options";
import {
  formatNameInput,
  composePhone,
  validatePhoneNational,
  NAME_MAX,
  MESSAGE_MAX,
} from "@/lib/validation";
import { DEFAULT_ISO, getCountry, nationalLengths } from "@/lib/countries";

const initialState: PartenariatState = { status: "idle" };

const selectClass =
  "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const textareaClass =
  "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-[14px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none";

function Select({
  name,
  options,
  placeholder = "Sélectionnez",
}: {
  name: string;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <select id={name} name={name} className={selectClass} required defaultValue="">
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/**
 * Champs propres à chaque catégorie. Le `key` posé sur le fragment par le
 * parent remonte le DOM à chaque changement de catégorie : les champs de la
 * catégorie précédente ne sont jamais envoyés.
 */
function CategoryFields({ cat }: { cat: PartnerCategory }) {
  switch (cat) {
    case "gestion":
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="typeFonds">Type de fonds proposé</Label>
            <Select name="typeFonds" options={gestionFondsOptions} placeholder="Sélectionnez un type" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="encours">Encours sous gestion (MAD)</Label>
              <Input id="encours" name="encours" type="number" placeholder="Ex: 50000000" className="h-11 rounded-lg" required min={0} step={1} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frais">Frais de gestion (%)</Label>
              <Input id="frais" name="frais" type="number" placeholder="Ex: 1.5" className="h-11 rounded-lg" required min={0} max={100} step={0.01} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="performance">Performance / track record du fonds</Label>
            <textarea id="performance" name="performance" placeholder="Décrivez les performances historiques..." rows={3} required minLength={10} maxLength={DETAIL_MAX} className={textareaClass} />
          </div>
        </>
      );
    case "assureur":
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="typeProduit">Type de produit proposé</Label>
            <Select name="typeProduit" options={assureurProduitOptions} placeholder="Sélectionnez un type" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="frais">Frais de gestion (%)</Label>
              <Input id="frais" name="frais" type="number" placeholder="Ex: 0.8" className="h-11 rounded-lg" required min={0} max={100} step={0.01} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fondsDirhams">Fonds en dirhams disponible</Label>
              <Select name="fondsDirhams" options={ouiNonOptions} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="specificites">Spécificités du contrat</Label>
            <textarea id="specificites" name="specificites" placeholder="Décrivez les spécificités..." rows={3} required minLength={10} maxLength={DETAIL_MAX} className={textareaClass} />
          </div>
        </>
      );
    case "immo":
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="typeBien">Type de bien à proposer</Label>
            <Select name="typeBien" options={immoBienOptions} placeholder="Sélectionnez un type" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="localisation">Localisation</Label>
              <Input id="localisation" name="localisation" type="text" placeholder="Ville, quartier..." className="h-11 rounded-lg" required maxLength={SHORT_TEXT_MAX} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prix">Prix de vente (MAD)</Label>
              <Input id="prix" name="prix" type="number" placeholder="Ex: 5000000" className="h-11 rounded-lg" required min={0} step={1} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rendement">Rendement locatif estimé (%)</Label>
            <Input id="rendement" name="rendement" type="number" placeholder="Ex: 6.5" className="h-11 rounded-lg" required min={0} max={100} step={0.01} />
          </div>
        </>
      );
    case "fonds":
      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="typeLevee">Type de levée</Label>
              <Select name="typeLevee" options={fondsLeveeOptions} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stade">Stade</Label>
              <Select name="stade" options={fondsStadeOptions} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secteur">Secteur cible</Label>
            <Input id="secteur" name="secteur" type="text" placeholder="Ex: Fintech, Agroalimentaire..." className="h-11 rounded-lg" required maxLength={SHORT_TEXT_MAX} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="montantRecherche">Montant recherché (MAD)</Label>
              <Input id="montantRecherche" name="montantRecherche" type="number" placeholder="Ex: 10000000" className="h-11 rounded-lg" required min={0} step={1} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticketMinimum">Ticket d&apos;entrée minimum (MAD)</Label>
              <Input id="ticketMinimum" name="ticketMinimum" type="number" placeholder="Ex: 500000" className="h-11 rounded-lg" required min={0} step={1} />
            </div>
          </div>
        </>
      );
    case "club":
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="nature">Nature du partenariat</Label>
            <Select name="nature" options={clubNatureOptions} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="montant">Montant à mobiliser (MAD)</Label>
              <Input id="montant" name="montant" type="number" placeholder="Ex: 20000000" className="h-11 rounded-lg" required min={0} step={1} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coInvestisseurs">Nombre de co-investisseurs</Label>
              <Input id="coInvestisseurs" name="coInvestisseurs" type="number" placeholder="Ex: 5" className="h-11 rounded-lg" required min={1} step={1} />
            </div>
          </div>
        </>
      );
  }
}

/**
 * Questionnaire de partenariat. La validation navigateur (`required`, bornes)
 * donne un retour immédiat ; la server action revalide tout avec zod et
 * enregistre dans `partner_submissions`.
 */
export function PartenariatForm() {
  const [state, formAction, pending] = useActionState(submitPartenariat, initialState);
  const [activeCat, setActiveCat] = useState<PartnerCategory>("gestion");
  const [name, setName] = useState("");
  const [iso, setIso] = useState(DEFAULT_ISO);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | undefined>();

  const composedPhone = composePhone(getCountry(iso).dial, phone);

  if (state.status === "success") {
    return (
      <AnimateIn variant="reveal-up">
        <div className="bg-white rounded-lg p-7 shadow-sm max-w-[760px] mx-auto">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="w-9 h-9 rounded-full bg-bronze/15 text-bronze-dark flex items-center justify-center shrink-0">
              <Check className="w-4.5 h-4.5" />
            </span>
            <h4 className="font-heading text-[21px] font-semibold text-ink leading-tight">
              Proposition bien reçue
            </h4>
          </div>
          <p className="text-[13.5px] text-warm-grey leading-[1.65]">
            Merci. Notre équipe étudie chaque proposition et revient vers vous à l&apos;adresse
            indiquée si elle correspond aux besoins de nos clients.
          </p>
        </div>
      </AnimateIn>
    );
  }

  return (
    <div className="bg-white rounded-lg p-7 shadow-sm max-w-[760px] mx-auto">
      <h4 className="text-[17.5px] font-semibold mb-5">Questionnaire de partenariat</h4>

      {/* Category selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {partnerCategories.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveCat(key)}
            aria-pressed={activeCat === key}
            className={`px-4 py-3 rounded-lg text-[13.5px] font-medium border transition-all duration-200 text-left ${
              key === "club" ? "sm:col-span-2" : ""
            } ${
              activeCat === key
                ? "border-bronze bg-bronze/10 text-bronze"
                : "border-ink/[0.1] bg-white text-charcoal hover:border-bronze/30"
            }`}
          >
            {partnerCategoryLabels[key]}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="category" value={activeCat} />

        {/* Dynamic fields per category - remounted on every switch. */}
        <div key={activeCat} className="space-y-4">
          <CategoryFields cat={activeCat} />
        </div>

        {/* Common fields */}
        <div className="border-t border-ink/[0.08] pt-4 mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom du contact</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Votre nom"
                className="h-11 rounded-lg"
                required
                maxLength={NAME_MAX}
                value={name}
                onChange={(e) => setName(formatNameInput(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Société</Label>
              <Input id="company" name="company" type="text" placeholder="Nom de la société" className="h-11 rounded-lg" required maxLength={COMPANY_MAX} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <PhoneInput
                id="phone"
                iso={iso}
                onIsoChange={setIso}
                value={phone}
                onChange={setPhone}
                onBlur={() =>
                  setPhoneError(validatePhoneNational(phone, nationalLengths(iso)) ?? undefined)
                }
                error={phoneError}
              />
              {phoneError && <p className="text-[12px] text-red-600 mt-1.5">{phoneError}</p>}
              {/* Valeur composée ("+212 612345678") réellement envoyée au serveur. */}
              <input type="hidden" name="phone" value={composedPhone} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="votre@email.com" className="h-11 rounded-lg" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description complémentaire</Label>
            <textarea id="description" name="description" placeholder="Informations supplémentaires..." rows={3} maxLength={MESSAGE_MAX} className={textareaClass} />
          </div>
        </div>

        {state.status === "error" && state.message && (
          <p className="text-[13px] text-red-600 leading-[1.5]" role="alert">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-bronze text-white h-11 font-medium text-[13.5px] tracking-[0.2px] hover:bg-bronze-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-lg cursor-pointer"
        >
          {pending ? "Envoi en cours…" : "Soumettre ma proposition"}
        </button>
      </form>
    </div>
  );
}
