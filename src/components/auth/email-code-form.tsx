"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CodeInput, CODE_LENGTH } from "@/components/auth/code-input";
import { AnimateIn } from "@/components/ui/animate-in";
import { formatNameInput, validateName, validateEmail, NAME_MAX } from "@/lib/validation";

const RESEND_COOLDOWN = 60;

interface EmailCodeFormProps {
  mode: "signup" | "login";
  redirectTo?: string;
  defaultEmail?: string;
  defaultFirstName?: string;
  defaultLastName?: string;
}

const inputClass =
  "w-full h-11 px-3.5 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

/**
 * Passwordless email flow.
 *
 * `signInWithOtp` covers both cases with one call — it creates the account when
 * `shouldCreateUser` is on. On the login page it stays off, so an unknown
 * address gets told to sign up instead of silently getting an account.
 */
export function EmailCodeForm({
  mode,
  redirectTo = "/espace",
  defaultEmail = "",
  defaultFirstName = "",
  defaultLastName = "",
}: EmailCodeFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [step, setStep] = useState<"details" | "code">("details");
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<React.ReactNode>("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function sendCode(isResend = false) {
    setError("");

    // Same rules as the rendez-vous form, from the shared module.
    if (isSignup) {
      const nameError = validateName(firstName, "Le prénom") ?? validateName(lastName, "Le nom");
      if (nameError) {
        setError(nameError);
        return;
      }
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setSending(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: isSignup,
        // Only applied when the account is actually created.
        data: isSignup
          ? { first_name: firstName.trim(), last_name: lastName.trim() }
          : undefined,
      },
    });
    setSending(false);

    if (otpError) {
      const message = otpError.message.toLowerCase();

      if (message.includes("signups not allowed") || message.includes("user not found")) {
        setError(
          <>
            Aucun compte n&apos;est associé à cette adresse.{" "}
            <Link href="/inscription" className="text-bronze hover:text-bronze-dark font-medium">
              Créer un espace client
            </Link>
          </>
        );
        return;
      }
      if (message.includes("security purposes") || otpError.status === 429) {
        setError("Trop de demandes. Patientez une minute avant de réessayer.");
        setCooldown(RESEND_COOLDOWN);
        return;
      }
      setError("L'envoi du code a échoué. Réessayez dans un instant.");
      return;
    }

    setCooldown(RESEND_COOLDOWN);
    if (!isResend) {
      setCode("");
      setStep("code");
    }
  }

  async function verifyCode(token: string) {
    if (verifiedRef.current) return;
    setError("");
    setVerifying(true);

    const supabase = createClient();
    const address = email.trim();

    // Supabase issues the code under the "email" type for a known address and
    // "signup" for one it just created. Trying both keeps a first-time visitor
    // from being told their perfectly valid code is wrong.
    let { error: verifyError } = await supabase.auth.verifyOtp({
      email: address,
      token,
      type: "email",
    });

    if (verifyError && isSignup) {
      ({ error: verifyError } = await supabase.auth.verifyOtp({
        email: address,
        token,
        type: "signup",
      }));
    }

    if (verifyError) {
      setVerifying(false);
      setCode("");
      setError("Code invalide ou expiré. Demandez-en un nouveau si besoin.");
      return;
    }

    verifiedRef.current = true;
    router.push(redirectTo);
    router.refresh();
  }

  // Verify as soon as the sixth digit lands — no extra click.
  useEffect(() => {
    if (step === "code" && code.length === CODE_LENGTH && !verifying && !verifiedRef.current) {
      verifyCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  if (step === "code") {
    return (
      <AnimateIn variant="fade-up" duration={0.45}>
        <div>
          <h2 className="font-heading text-[19px] font-semibold text-ink">
            Entrez le code reçu
          </h2>
          <p className="text-[13px] text-warm-grey leading-[1.6] mt-1.5">
            Nous avons envoyé un code à {CODE_LENGTH} chiffres à{" "}
            <span className="text-ink font-medium">{email}</span>. Il est valable 1 heure.
          </p>

          <div className="mt-5">
            <CodeInput
              value={code}
              onChange={setCode}
              disabled={verifying}
              autoFocus
            />
          </div>

          {verifying && (
            <p className="text-[12.5px] text-warm-grey mt-3">Vérification en cours...</p>
          )}
          {error && <p className="text-[12.5px] text-red-600 mt-3">{error}</p>}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 text-[12.5px]">
            <button
              type="button"
              onClick={() => sendCode(true)}
              disabled={cooldown > 0 || sending}
              className="text-bronze hover:text-bronze-dark font-medium disabled:text-warm-grey disabled:cursor-not-allowed cursor-pointer"
            >
              {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("details");
                setCode("");
                setError("");
              }}
              className="text-warm-grey hover:text-ink cursor-pointer"
            >
              Modifier l&apos;adresse
            </button>
          </div>

          <p className="text-[11.5px] text-warm-grey mt-5 leading-[1.5]">
            Vous ne trouvez pas l&apos;email ? Regardez dans vos spams.
          </p>
        </div>
      </AnimateIn>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendCode();
      }}
      className="space-y-4"
    >
      {isSignup && (
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="firstName" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Prénom
            </label>
            <input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(formatNameInput(e.target.value))}
              maxLength={NAME_MAX}
              autoComplete="given-name"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-[12.5px] font-medium text-ink mb-1.5">
              Nom
            </label>
            <input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(formatNameInput(e.target.value))}
              maxLength={NAME_MAX}
              autoComplete="family-name"
              required
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-[12.5px] font-medium text-ink mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="votre@email.com"
          required
          className={inputClass}
        />
      </div>

      {error && <p className="text-[12.5px] text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="w-full h-11 text-[13.5px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-60 transition-colors cursor-pointer"
      >
        {sending ? "Envoi du code..." : "Recevoir un code par email"}
      </button>

      <p className="text-[11.5px] text-warm-grey leading-[1.5]">
        Pas de mot de passe à retenir : nous vous envoyons un code à {CODE_LENGTH} chiffres à chaque
        connexion.
      </p>
    </form>
  );
}
