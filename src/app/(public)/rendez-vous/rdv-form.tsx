"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AnimateIn } from "@/components/ui/animate-in";
import { submitAppointmentRequest, emailHasAccount, type RdvState } from "./actions";
import { RequestSent } from "./request-sent";
import {
  besoinOptions,
  patrimoineOptions,
  investissementOptions,
  sourceOptions,
  VILLE_MAX,
} from "@/lib/rdv-options";
import {
  validateName,
  formatNameInput,
  NAME_MAX,
  validateEmail,
  validatePhoneNational,
  validateBesoinAutre,
  composePhone,
  MESSAGE_MAX,
  BESOIN_AUTRE_MAX,
} from "@/lib/validation";
import { PhoneInput } from "@/components/ui/phone-input";
import { CreneauPicker } from "@/components/booking/creneau-picker";
import { ModeSelector, type RdvMode } from "@/components/booking/mode-selector";
import { DEFAULT_ISO, getCountry, nationalLengths } from "@/lib/countries";

const initialState: RdvState = { status: "idle" };
const TOTAL_STEPS = 6;
const AUTRE_BESOIN = "Autre besoin";

function Option({
  label,
  selected,
  onSelect,
  className = "",
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left px-4 py-3 rounded-lg border text-[13.5px] leading-[1.4] transition-all duration-200 cursor-pointer ${
        selected
          ? "border-bronze bg-bronze/10 text-ink font-medium"
          : "border-cream-deep bg-white text-charcoal hover:border-bronze/50"
      } ${className}`}
    >
      {label}
    </button>
  );
}

/**
 * Two columns from `sm` up, so an odd number of options leaves the last one
 * alone at the left of its row. That orphan spans the row instead and is
 * centred at the exact width of a normal cell: half the grid minus half the
 * 10px gap. An even count already fills every row, so nothing changes.
 */
function OptionGrid({
  options,
  isSelected,
  onSelect,
}: {
  options: readonly string[];
  isSelected: (label: string) => boolean;
  onSelect: (label: string) => void;
}) {
  const hasOrphan = options.length % 2 === 1;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {options.map((label, i) => (
        <Option
          key={label}
          label={label}
          selected={isSelected(label)}
          onSelect={() => onSelect(label)}
          className={
            hasOrphan && i === options.length - 1
              ? "sm:col-span-2 sm:justify-self-center sm:w-[calc(50%-0.3125rem)]"
              : ""
          }
        />
      ))}
    </div>
  );
}

function StepHeading({ index, question }: { index: number; question: string }) {
  return (
    <>
      <div className="text-bronze-dark text-[11px] font-semibold tracking-[1.6px] uppercase">
        Question {index}
      </div>
      <h2 className="font-heading text-[21px] font-semibold text-ink mt-1.5 mb-5 leading-[1.3]">
        {question}
      </h2>
    </>
  );
}

const inputBase =
  "w-full h-11 px-3.5 text-[14px] bg-white rounded-lg outline-none border transition-colors";

function inputClass(hasError: boolean) {
  return `${inputBase} ${
    hasError ? "border-red-500 focus:border-red-500" : "border-cream-deep focus:border-bronze"
  }`;
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email";
  maxLength?: number;
}

function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12.5px] font-medium text-ink mb-1.5">
        {label}
        {required ? (
          // Decorative: `aria-required` already announces it to screen readers.
          <span className="text-bronze ml-0.5" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-warm-grey font-normal"> (facultatif)</span>
        )}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass(Boolean(error))}
      />
      {error && (
        <p id={`${id}-error`} className="text-[12px] text-red-600 mt-1.5 leading-[1.45]">
          {error}
        </p>
      )}
    </div>
  );
}

export function RdvForm() {
  const [step, setStep] = useState(0);
  const [besoins, setBesoins] = useState<string[]>([]);
  const [besoinAutre, setBesoinAutre] = useState("");
  const autreRef = useRef<HTMLTextAreaElement>(null);
  const [patrimoine, setPatrimoine] = useState("");
  const [investissement, setInvestissement] = useState("");
  const [source, setSource] = useState("");
  const [ville, setVille] = useState("");
  const [consentement, setConsentement] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneIso, setPhoneIso] = useState(DEFAULT_ISO);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Le créneau tenu par le CreneauPicker. `slotStart` retombe à null si le
  // hold expire pendant que l'utilisateur est encore sur cette étape.
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [mode, setMode] = useState<RdvMode | null>(null);
  // Une adresse déjà rattachée à un compte ne peut pas servir à une réservation
  // visiteur - vérifié à la sortie du champ, reconfirmé côté serveur au submit.
  const [emailTaken, setEmailTaken] = useState(false);

  const [state, formAction, pending] = useActionState(submitAppointmentRequest, initialState);

  const errors = {
    firstName: validateName(firstName, "Le prénom"),
    lastName: validateName(lastName, "Le nom"),
    email: validateEmail(email),
    phone: validatePhoneNational(phone, nationalLengths(phoneIso)),
    ville: ville.trim().length >= 2 ? null : "Indiquez votre ville de résidence.",
  };
  const coordonneesValid =
    Object.values(errors).every((e) => e === null) && !emailTaken && consentement;
  // Errors only surface once a field has been left, so an untouched form is
  // never covered in red before anything has been typed.
  const shown = (field: keyof typeof errors) =>
    touched[field] ? errors[field] ?? undefined : undefined;
  const markTouched = (field: keyof typeof errors) =>
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));

  // Au blur : si l'email est bien formé, on demande au serveur s'il a déjà un
  // compte. Toute frappe efface le verdict, le temps d'une nouvelle saisie.
  const checkEmailTaken = async () => {
    markTouched("email");
    if (validateEmail(email) === null) setEmailTaken(await emailHasAccount(email));
  };
  const emailError =
    shown("email") ??
    (emailTaken
      ? "Cette adresse a déjà un espace client. Connectez-vous, ou utilisez une autre adresse."
      : undefined);

  const autreSelected = besoins.includes(AUTRE_BESOIN);

  useEffect(() => {
    if (autreSelected) autreRef.current?.focus({ preventScroll: true });
  }, [autreSelected]);

  // The request is already saved at this point. Creating an account is optional
  // and never blocks the conseiller from seeing the demande.
  if (state.status === "success") {
    return (
      <RequestSent
        firstName={firstName}
        lastName={lastName}
        email={email}
        bookedSlot={state.bookedSlot ?? null}
        bookedMode={mode}
      />
    );
  }

  const toggleBesoin = (label: string) =>
    setBesoins((current) =>
      current.includes(label) ? current.filter((b) => b !== label) : [...current, label]
    );

  const canContinue =
    (step === 0 &&
      besoins.length > 0 &&
      (!autreSelected || validateBesoinAutre(besoinAutre) === null)) ||
    (step === 1 && patrimoine !== "") ||
    (step === 2 && investissement !== "") ||
    (step === 3 && source !== "") ||
    // Le créneau est obligatoire : sans lui, pas de demande. Si la grille est
    // vide, l'étape ne se franchit pas - le CreneauPicker l'explique.
    (step === 4 && slotStart !== null && mode !== null);

  return (
    <form action={formAction} className="bg-cream border border-cream-deep rounded-lg p-6 sm:p-8">
      {/* Answers from earlier steps travel with the submit. */}
      {besoins.map((b) => (
        <input key={b} type="hidden" name="besoins" value={b} />
      ))}
      {autreSelected && <input type="hidden" name="besoinAutre" value={besoinAutre} />}
      <input type="hidden" name="patrimoine" value={patrimoine} />
      <input type="hidden" name="phone" value={composePhone(getCountry(phoneIso).dial, phone)} />
      <input type="hidden" name="investissement" value={investissement} />
      <input type="hidden" name="source" value={source} />
      {slotStart && holdToken && mode && (
        <>
          <input type="hidden" name="slotStart" value={slotStart} />
          <input type="hidden" name="holdToken" value={holdToken} />
          <input type="hidden" name="mode" value={mode} />
        </>
      )}

      <div className="flex gap-1.5 mb-7">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= step ? "bg-bronze" : "bg-cream-deep"
            }`}
          />
        ))}
      </div>

      {/* `key` on AnimateIn remounts it, so each step replays the approved entrance. */}
      <AnimateIn key={step} variant="fade-up" mobileVariant="fade-left" duration={0.45}>
        <div>
          {step === 0 && (
            <>
              <StepHeading index={1} question="De quoi avez-vous besoin aujourd'hui ?" />
              <p className="text-[12.5px] text-warm-grey -mt-3 mb-4">
                Plusieurs réponses possibles.
              </p>
              <OptionGrid
                options={besoinOptions}
                isSelected={(label) => besoins.includes(label)}
                onSelect={toggleBesoin}
              />

              {/* Same 0fr -> 1fr grid reveal as the FAQ and the guide form: it
                  animates to the content's natural height without measuring. */}
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: autreSelected ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="pt-3">
                    <label
                      htmlFor="besoinAutre"
                      className="block text-[12.5px] font-medium text-ink mb-1.5"
                    >
                      Précisez votre besoin
                      <span className="text-bronze ml-0.5" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <textarea
                      id="besoinAutre"
                      ref={autreRef}
                      rows={2}
                      maxLength={BESOIN_AUTRE_MAX}
                      value={besoinAutre}
                      onChange={(e) => setBesoinAutre(e.target.value)}
                      placeholder="En quelques mots, ce que vous cherchez à accomplir."
                      // Collapsed, it is still in the DOM: keep it out of the
                      // tab order and out of the accessibility tree.
                      tabIndex={autreSelected ? 0 : -1}
                      aria-hidden={!autreSelected}
                      className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors resize-y"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <StepHeading index={2} question="Quel est votre patrimoine global estimé ?" />
              <OptionGrid
                options={patrimoineOptions}
                isSelected={(label) => patrimoine === label}
                onSelect={setPatrimoine}
              />
            </>
          )}

          {step === 2 && (
            <>
              <StepHeading
                index={3}
                question="Montant d'investissement envisagé à court terme ?"
              />
              <OptionGrid
                options={investissementOptions}
                isSelected={(label) => investissement === label}
                onSelect={setInvestissement}
              />
            </>
          )}

          {step === 3 && (
            <>
              <StepHeading index={4} question="Comment avez-vous découvert Horkos ?" />
              <OptionGrid
                options={sourceOptions}
                isSelected={(label) => source === label}
                onSelect={setSource}
              />
            </>
          )}

          {step === 4 && (
            <>
              <StepHeading index={5} question="Quand souhaitez-vous nous rencontrer ?" />
              <div className="mb-4">
                <ModeSelector value={mode} onChange={setMode} />
              </div>
              <CreneauPicker
                onSelect={(slot, token) => {
                  setSlotStart(slot);
                  setHoldToken(token);
                }}
              />
            </>
          )}

          {step === 5 && (
            <>
              <StepHeading index={6} question="Vos coordonnées" />
              <p className="text-[12.5px] text-warm-grey -mt-3 mb-4">
                Les champs suivis de{" "}
                <span className="text-bronze font-semibold">*</span> sont obligatoires.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="firstName"
                  label="Prénom"
                  required
                  value={firstName}
                  onChange={(v) => setFirstName(formatNameInput(v))}
                  maxLength={NAME_MAX}
                  onBlur={() => markTouched("firstName")}
                  error={shown("firstName")}
                  autoComplete="given-name"
                />
                <TextField
                  id="lastName"
                  label="Nom"
                  required
                  value={lastName}
                  onChange={(v) => setLastName(formatNameInput(v))}
                  maxLength={NAME_MAX}
                  onBlur={() => markTouched("lastName")}
                  error={shown("lastName")}
                  autoComplete="family-name"
                />
                <TextField
                  id="email"
                  label="Email"
                  required
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(v) => {
                    setEmail(v);
                    if (emailTaken) setEmailTaken(false);
                  }}
                  onBlur={checkEmailTaken}
                  error={emailError}
                  placeholder="votre@email.com"
                  autoComplete="email"
                />
                <div>
                  <label htmlFor="phone" className="block text-[12.5px] font-medium text-ink mb-1.5">
                    Téléphone
                    <span className="text-bronze ml-0.5" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <PhoneInput
                    id="phone"
                    iso={phoneIso}
                    onIsoChange={setPhoneIso}
                    value={phone}
                    onChange={setPhone}
                    onBlur={() => markTouched("phone")}
                    error={shown("phone")}
                  />
                </div>
                {/* Seule sur sa ligne : centrée à la largeur d'une cellule
                    (moitié de la grille moins la moitié du gap de 16px). */}
                <div className="sm:col-span-2 sm:justify-self-center sm:w-[calc(50%-0.5rem)]">
                  <TextField
                    id="ville"
                    label="Ville de résidence"
                    required
                    value={ville}
                    onChange={setVille}
                    maxLength={VILLE_MAX}
                    onBlur={() => markTouched("ville")}
                    error={shown("ville")}
                    placeholder="Casablanca"
                    autoComplete="address-level2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="message" className="block text-[12.5px] font-medium text-ink mb-1.5">
                    Un mot sur votre situation{" "}
                    <span className="text-warm-grey font-normal">(facultatif)</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    maxLength={MESSAGE_MAX}
                    className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors resize-y"
                  />
                </div>
                <label
                  htmlFor="consentement"
                  className="sm:col-span-2 flex items-start gap-2.5 text-[12.5px] text-charcoal leading-[1.5] cursor-pointer"
                >
                  <input
                    id="consentement"
                    name="consentement"
                    type="checkbox"
                    checked={consentement}
                    onChange={(e) => setConsentement(e.target.checked)}
                    required
                    className="mt-0.5 h-4 w-4 shrink-0 accent-bronze cursor-pointer"
                  />
                  <span>
                    J&apos;accepte que les informations renseignées soient utilisées par Horkos
                    pour traiter ma demande de contact, conformément à sa{" "}
                    <a
                      href="/politique-de-confidentialite"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bronze-dark underline underline-offset-2 hover:text-bronze transition-colors"
                    >
                      politique de confidentialité
                    </a>
                    .<span className="text-bronze ml-0.5" aria-hidden="true">*</span>
                  </span>
                </label>
              </div>
            </>
          )}
        </div>
      </AnimateIn>

      {state.status === "error" && (
        <p className="text-[13px] text-red-600 mt-5">{state.message}</p>
      )}

      <div className="flex items-center gap-3 mt-7">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="px-5 py-3 text-[13.5px] font-medium text-charcoal border border-cream-deep bg-white rounded-lg hover:border-bronze/50 transition-colors cursor-pointer"
          >
            Retour
          </button>
        )}

        {step < TOTAL_STEPS - 1 ? (
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 px-6 py-3 text-[13.5px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Continuer →
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending || !coordonneesValid}
            className="flex-1 px-6 py-3 text-[13.5px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {pending ? "Envoi..." : "Envoyer ma demande"}
          </button>
        )}
      </div>

      {/* A disabled button with no explanation reads as a broken page. */}
      {step === TOTAL_STEPS - 1 && !coordonneesValid && (
        <p className="text-[12px] text-warm-grey mt-3">
          Renseignez les champs obligatoires pour envoyer votre demande.
        </p>
      )}

      <p className="text-[11.5px] text-warm-grey mt-4 leading-[1.5]">
        Vos réponses ne servent qu&apos;à préparer notre échange. Aucun engagement, et le
        premier rendez-vous est gratuit.
      </p>
    </form>
  );
}
