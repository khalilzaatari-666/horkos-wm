"use client";

import { useActionState, useState } from "react";
import { PhoneInput } from "@/components/ui/phone-input";
import { besoinOptions, patrimoineOptions, investissementOptions } from "@/lib/rdv-options";
import {
  formatNameInput,
  validateName,
  validatePhoneNational,
  composePhone,
  MESSAGE_MAX,
  BESOIN_AUTRE_MAX,
} from "@/lib/validation";
import { DEFAULT_ISO, getCountry, nationalLengths } from "@/lib/countries";
import { completerProfil, type IntakeState } from "./actions";

const initialState: IntakeState = { status: "idle" };
const AUTRE_BESOIN = "Autre besoin";

const champ =
  "w-full h-11 px-3.5 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

/** Une pastille de choix, reprise du questionnaire de rendez-vous. */
function Option({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left px-3.5 py-2.5 text-[13.5px] rounded-lg border transition-colors cursor-pointer ${
        selected
          ? "border-bronze bg-bronze/10 text-ink font-medium"
          : "border-cream-deep bg-white text-charcoal hover:border-bronze/50"
      }`}
    >
      {label}
    </button>
  );
}

function Section({
  titre,
  aide,
  children,
}: {
  titre: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-[16px] font-semibold text-ink">{titre}</h2>
      {aide && <p className="text-[12.5px] text-warm-grey mt-1 mb-3">{aide}</p>}
      <div className={aide ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

/**
 * Le questionnaire d'entrée, rempli une fois avant d'accéder à l'espace.
 *
 * Les intitulés et les options viennent de `@/lib/rdv-options`, les mêmes que le
 * questionnaire de rendez-vous : un client qui remplit les deux ne doit pas
 * découvrir deux vocabulaires pour la même question.
 *
 * Contrairement au parcours de réservation, tout tient sur une page. C'est une
 * porte, pas une visite guidée : la découper en cinq étapes ferait abandonner
 * quelqu'un qui voulait seulement voir son espace.
 */
export function IntakeForm({
  defaultFirstName,
  defaultLastName,
}: {
  defaultFirstName: string;
  defaultLastName: string;
}) {
  const [state, formAction, pending] = useActionState(completerProfil, initialState);

  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [iso, setIso] = useState(DEFAULT_ISO);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [besoins, setBesoins] = useState<string[]>([]);
  const [besoinAutre, setBesoinAutre] = useState("");
  const [patrimoine, setPatrimoine] = useState("");
  const [investissement, setInvestissement] = useState("");

  const autreSelected = besoins.includes(AUTRE_BESOIN);

  const toggleBesoin = (label: string) =>
    setBesoins((current) =>
      current.includes(label) ? current.filter((b) => b !== label) : [...current, label]
    );

  const nomsValides = !validateName(firstName, "Le prénom") && !validateName(lastName, "Le nom");
  const complet =
    nomsValides &&
    phone.trim().length > 0 &&
    !validatePhoneNational(phone, nationalLengths(iso)) &&
    besoins.length > 0 &&
    (!autreSelected || besoinAutre.trim().length > 0) &&
    patrimoine !== "" &&
    investissement !== "";

  return (
    <form action={formAction} className="space-y-8">
      {/* Ce que les listes à cocher ne peuvent pas transporter seules. */}
      {besoins.map((b) => (
        <input key={b} type="hidden" name="besoins" value={b} />
      ))}
      <input type="hidden" name="patrimoine" value={patrimoine} />
      <input type="hidden" name="investissement" value={investissement} />
      <input
        type="hidden"
        name="phone"
        value={composePhone(getCountry(iso).dial, phone)}
      />

      <Section titre="Vos coordonnées">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Prénom <span className="text-bronze">*</span>
            </label>
            <input
              id="firstName"
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(formatNameInput(e.target.value))}
              required
              className={champ}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Nom <span className="text-bronze">*</span>
            </label>
            <input
              id="lastName"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(formatNameInput(e.target.value))}
              required
              className={champ}
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="phone" className="block text-[12.5px] font-medium text-ink mb-1.5">
            Téléphone <span className="text-bronze">*</span>
          </label>
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
        </div>
      </Section>

      <Section
        titre="De quoi avez-vous besoin aujourd'hui ?"
        aide="Plusieurs réponses possibles."
      >
        <div className="grid sm:grid-cols-2 gap-2">
          {besoinOptions.map((b) => (
            <Option
              key={b}
              label={b}
              selected={besoins.includes(b)}
              onSelect={() => toggleBesoin(b)}
            />
          ))}
        </div>

        {autreSelected && (
          <div className="pt-3">
            <label
              htmlFor="besoinAutre"
              className="block text-[12.5px] font-medium text-ink mb-1.5"
            >
              Précisez votre besoin <span className="text-bronze">*</span>
            </label>
            <textarea
              id="besoinAutre"
              name="besoinAutre"
              rows={2}
              maxLength={BESOIN_AUTRE_MAX}
              value={besoinAutre}
              onChange={(e) => setBesoinAutre(e.target.value)}
              placeholder="En quelques mots, ce que vous cherchez à accomplir."
              className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors resize-y"
            />
          </div>
        )}
      </Section>

      <Section titre="Quel est votre patrimoine global estimé ?">
        <div className="grid sm:grid-cols-2 gap-2">
          {patrimoineOptions.map((p) => (
            <Option
              key={p}
              label={p}
              selected={patrimoine === p}
              onSelect={() => setPatrimoine(p)}
            />
          ))}
        </div>
      </Section>

      <Section titre="Montant d'investissement envisagé à court terme ?">
        <div className="grid sm:grid-cols-2 gap-2">
          {investissementOptions.map((i) => (
            <Option
              key={i}
              label={i}
              selected={investissement === i}
              onSelect={() => setInvestissement(i)}
            />
          ))}
        </div>
      </Section>

      <Section titre="Un mot pour votre conseiller ?" aide="Facultatif.">
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={MESSAGE_MAX}
          placeholder="Un contexte, une échéance, une question."
          className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors resize-y"
        />
      </Section>

      {state.status === "error" && state.message && (
        <p className="text-[13px] text-red-600" aria-live="polite">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !complet}
        className="w-full h-12 text-[14px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {pending ? "Enregistrement…" : "Accéder à mon espace"}
      </button>
    </form>
  );
}
