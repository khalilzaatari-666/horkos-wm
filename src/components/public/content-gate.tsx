"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { CodeInput, CODE_LENGTH } from "@/components/auth/code-input";
import { demanderCode, renvoyerCode, verifierCode } from "@/app/(public)/ressources/lecteur-actions";
import { lancerConfettis } from "./confetti";
import {
  validateName,
  formatNameInput,
  validateEmail,
  validatePhoneNational,
  composePhone,
} from "@/lib/validation";
import { DEFAULT_ISO, getCountry, nationalLengths } from "@/lib/countries";

type Source = "guide" | "article";

const RESEND_COOLDOWN = 60;

const inputBase =
  "h-12 w-full min-w-0 px-4 text-[16px] bg-white border rounded-lg outline-none transition-colors";
const fieldBorder = (error?: string) =>
  error ? "border-red-500 focus:border-red-500" : "border-ink/15 focus:border-bronze focus:ring-4 focus:ring-bronze/15";

interface GateProps {
  sourceType: Source;
  sourceId: string;
  /** Étape du code SMS active (`smsActif()`, côté serveur). */
  sms: boolean;
}

/**
 * La suite réservée d'un article : un aperçu flouté (fourni par la page,
 * jamais le vrai contenu) sous la carte du lecteur.
 */
export function ContentGate({ children, ...props }: GateProps & { children: ReactNode }) {
  return (
    // La carte fixe la hauteur ; l'aperçu flouté remplit cette zone en fond,
    // et déborde un peu sous la carte.
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
        {children}
      </div>
      <div className="relative z-10 flex justify-center px-3 pt-10 pb-20 sm:px-6 sm:pt-16 sm:pb-28">
        <GateCard {...props} className="max-w-[520px] shadow-[0_24px_60px_-28px_rgba(11,26,46,0.35)]" />
      </div>
    </div>
  );
}

/**
 * La carte du lecteur : ses coordonnées, puis le code reçu par SMS quand
 * Twilio est configuré. La fiche ouverte pose le cookie qui ouvre tous les
 * contenus ; la page se recharge alors, déverrouillée.
 */
export function GateCard({ sourceType, sourceId, sms, className = "" }: GateProps & { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<"details" | "code">("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [iso, setIso] = useState(DEFAULT_ISO);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [leadId, setLeadId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const verifying = useRef(false);

  const composedPhone = composePhone(getCountry(iso).dial, phone);
  const formValid =
    validateName(firstName, "Le prénom") === null &&
    validateName(lastName, "Le nom") === null &&
    validateEmail(email) === null &&
    validatePhoneNational(phone, nationalLengths(iso)) === null &&
    consent;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || busy) return;
    setBusy(true);
    setError("");
    const res = await demanderCode({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: composedPhone,
      consent,
      sourceType,
      sourceId,
    });
    if (!res.ok) {
      setBusy(false);
      return setError(res.message);
    }
    // Sans étape SMS, la fiche est déjà ouverte.
    if (res.ouvert) return ouvrir(res.emailSent);
    setBusy(false);
    setLeadId(res.leadId);
    setCode("");
    setStep("code");
    setCooldown(RESEND_COOLDOWN);
  }

  // Le serveur relit le cookie et rend la page ouverte, avec le merci.
  const ouvrir = useCallback(
    (emailSent: boolean) => router.replace(`${pathname}?merci=${emailSent ? "1" : "0"}`, { scroll: false }),
    [router, pathname]
  );

  async function renvoyer() {
    setError("");
    const res = await renvoyerCode(leadId);
    if (!res.ok) return setError(res.message);
    setCooldown(RESEND_COOLDOWN);
  }

  // Vérifie dès le sixième chiffre, sans clic de plus.
  useEffect(() => {
    if (step !== "code" || code.length !== CODE_LENGTH || verifying.current) return;
    verifying.current = true;
    setBusy(true);
    setError("");
    verifierCode(leadId, code).then((res) => {
      if (!res.ok) {
        verifying.current = false;
        setBusy(false);
        setError(res.message);
        setCode("");
        return;
      }
      ouvrir(res.emailSent);
    });
  }, [code, step, leadId, ouvrir]);

  return (
    <div className={`w-full rounded-[20px] border border-ink/10 bg-white p-5 sm:p-7 ${className}`}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-deep px-3 py-1 text-[12.5px] font-medium text-ink">
        <Lock className="size-3.5" aria-hidden="true" /> La suite s’ouvre avec vos coordonnées
      </span>

      {step === "details" ? (
        <form onSubmit={envoyer} noValidate>
          <h2 className="mt-3 font-heading text-[23px] leading-tight text-ink">
            {sourceType === "guide" ? "Lisez la suite du guide" : "Lisez la suite de l’article"}
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-charcoal">
            {sms
              ? "Un code vous est envoyé par SMS, puis tous nos guides et articles s’ouvrent."
              : "Tous nos guides et articles s’ouvrent aussitôt, et celui-ci vous est aussi envoyé par email."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Champ id="gate-prenom" label="Prénom" error={errors.firstName}>
              <input
                id="gate-prenom"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(formatNameInput(e.target.value))}
                onBlur={() => setErrors((p) => ({ ...p, firstName: validateName(firstName, "Le prénom") ?? undefined }))}
                aria-invalid={errors.firstName ? true : undefined}
                className={`${inputBase} ${fieldBorder(errors.firstName)}`}
              />
            </Champ>
            <Champ id="gate-nom" label="Nom" error={errors.lastName}>
              <input
                id="gate-nom"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(formatNameInput(e.target.value))}
                onBlur={() => setErrors((p) => ({ ...p, lastName: validateName(lastName, "Le nom") ?? undefined }))}
                aria-invalid={errors.lastName ? true : undefined}
                className={`${inputBase} ${fieldBorder(errors.lastName)}`}
              />
            </Champ>
            <Champ id="gate-email" label="Email" error={errors.email} wide>
              <input
                id="gate-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(email) ?? undefined }))}
                placeholder="votre@email.com"
                aria-invalid={errors.email ? true : undefined}
                className={`${inputBase} ${fieldBorder(errors.email)}`}
              />
            </Champ>
            <Champ id="gate-tel" label="Téléphone mobile" error={errors.phone} wide>
              <PhoneInput
                id="gate-tel"
                iso={iso}
                onIsoChange={setIso}
                value={phone}
                onChange={setPhone}
                onBlur={() =>
                  setErrors((p) => ({ ...p, phone: validatePhoneNational(phone, nationalLengths(iso)) ?? undefined }))
                }
                error={errors.phone}
              />
            </Champ>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[12px] leading-[1.5] text-charcoal">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-bronze"
            />
            <span>
              J’accepte que mes coordonnées soient utilisées par Horkos pour m’envoyer ce contenu et me
              recontacter, conformément à sa{" "}
              <a
                href="/politique-de-confidentialite"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline underline-offset-2 transition-colors hover:text-ink/70"
              >
                politique de confidentialité
              </a>{" "}
              (loi 09-08).
            </span>
          </label>

          {error && <p className="mt-4 text-[13px] text-red-600" role="alert">{error}</p>}

          <button type="submit" disabled={!formValid || busy} className="btn btn-ink mt-5 w-full">
            {sms ? (busy ? "Envoi du code…" : "Recevoir le code par SMS") : busy ? "Ouverture…" : "Lire la suite"}
          </button>
        </form>
      ) : (
        <div>
          <h2 className="mt-3 font-heading text-[23px] leading-tight text-ink">Entrez le code reçu</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-charcoal">
            Un code à {CODE_LENGTH} chiffres vient d’être envoyé par SMS au{" "}
            <span className="font-medium text-ink">{composedPhone}</span>. Il est valable 10 minutes.
          </p>
          <div className="mt-6">
            <CodeInput value={code} onChange={setCode} disabled={busy} autoFocus />
          </div>
          {busy && <p className="mt-3 text-[13px] text-warm-grey">Vérification en cours…</p>}
          {error && <p className="mt-3 text-[13px] text-red-600" role="alert">{error}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            <button
              type="button"
              onClick={renvoyer}
              disabled={cooldown > 0 || busy}
              className="cursor-pointer font-medium text-ink hover:text-ink/70 disabled:cursor-not-allowed disabled:text-warm-grey"
            >
              {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("details");
                setError("");
              }}
              className="cursor-pointer text-warm-grey hover:text-ink"
            >
              Modifier le numéro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Lignes factices sous le formulaire : la forme d’un texte, jamais le vrai. */
const LIGNES = [
  "Chaque situation patrimoniale appelle une lecture attentive de ses objectifs, de son horizon et de ses contraintes, avant toute comparaison.",
  "Les dispositifs évoqués ici se comparent à partir de critères concrets, que nous détaillons point par point dans la suite de ce document.",
  "La fiscalité applicable dépend de la résidence, de la nature des actifs et de la structure de détention retenue pour les porter.",
  "Quelques exemples chiffrés permettent de mesurer les écarts entre les options les plus courantes, sur un horizon de dix ans.",
  "Nous terminons par les points de vigilance à garder en tête avant toute décision, et les questions à poser à votre conseiller.",
];

/**
 * Le brouillard sous le formulaire : toute la hauteur de la zone, un peu plus
 * large que le texte, fondu sur les quatre côtés - le flou s'y dissipe au lieu d'être coupé net en rectangle.
 */
export function LignesFloues() {
  return (
    <div
      className="absolute -inset-x-4 -top-6 bottom-0 overflow-hidden px-4 pt-6 sm:-inset-x-12 sm:px-12"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, black 10%, black 60%, rgba(0, 0, 0, 0.4) 80%, transparent 96%), linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      <div className="space-y-6 blur-[5px]">
        {[...LIGNES, ...LIGNES].map((ligne, i) => (
          <p key={i} className="text-[18px] leading-[1.8] text-charcoal">
            {ligne}
          </p>
        ))}
      </div>
    </div>
  );
}

function Champ({
  id,
  label,
  error,
  wide,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-[12px] text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Le remerciement, en tête du contenu qui vient de s'ouvrir : confettis et
 * rappel de l'email. La page le rend quand l'URL porte `?merci=` (posé par
 * le formulaire juste après la vérification) ; le paramètre est aussitôt
 * retiré de l'URL, pour qu'un rechargement ne le rejoue pas.
 */
export function MerciLecteur({
  sourceType,
  titre,
  emailSent,
}: {
  sourceType: Source;
  titre: string;
  emailSent: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    window.history.replaceState(null, "", window.location.pathname);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    lancerConfettis(el);
  }, []);

  const guide = sourceType === "guide";
  return (
    <div ref={ref} role="status" className="mb-10 rounded-[20px] bg-cream-deep px-6 py-5 text-ink sm:px-8 sm:py-6">
      <p className="font-heading text-[22px] leading-snug">
        Merci d’avoir téléchargé {guide ? "le guide" : "l’article"} « {titre} ».
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-charcoal">
        {emailSent
          ? `Vérifiez vos mails, et vos spams : ${guide ? "le guide" : "l’article"} vous y attend aussi. Tous nos guides et articles sont désormais ouverts.`
          : "Tous nos guides et articles sont désormais ouverts."}
      </p>
    </div>
  );
}
