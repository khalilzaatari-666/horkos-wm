"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AnimateIn } from "@/components/ui/animate-in";
import { verifierCodeMfa, type MfaState } from "./actions";

const inputClass =
  "w-full h-11 px-3.5 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

const initialState: MfaState = { status: "idle" };

type Props =
  | { mode: "verifier"; factorId: string; redirect: string }
  | { mode: "inscrire"; factorId: string; qrCode: string; secret: string; redirect: string }
  | { mode: "indisponible"; redirect: string; message: string };

export function MfaForm(props: Props) {
  const [state, formAction, pending] = useActionState(verifierCodeMfa, initialState);
  const inscription = props.mode === "inscrire";

  return (
    <div className="flex justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <AnimateIn variant="blur-in" duration={0.5}>
            <span className="text-bronze-dark text-[11px] font-semibold tracking-[1.6px] uppercase">
              Accès réservé
            </span>
            <h1 className="font-heading text-[26px] font-semibold text-ink mt-1.5">
              {inscription ? "Activer la double authentification" : "Vérification"}
            </h1>
          </AnimateIn>
          <AnimateIn variant="fade-up" delay={150}>
            <p className="mt-2 text-[13.5px] text-warm-grey leading-[1.6]">
              {inscription
                ? "Le back-office exige un second facteur. Scannez le code avec une application d'authentification (Google Authenticator, Microsoft Authenticator, 1Password…), puis saisissez le code affiché."
                : "Saisissez le code à six chiffres de votre application d'authentification."}
            </p>
          </AnimateIn>
        </div>

        {props.mode === "indisponible" ? (
          <AnimateIn variant="fade-up" delay={250}>
            <div className="bg-cream border border-cream-deep rounded-lg p-6">
              <p className="text-[13.5px] text-red-600" role="alert">
                {props.message}
              </p>
            </div>
          </AnimateIn>
        ) : (
          <AnimateIn variant="fade-up" delay={250}>
            <form
              action={formAction}
              className="bg-cream border border-cream-deep rounded-lg p-6 space-y-4"
            >
              <input type="hidden" name="factorId" value={props.factorId} />
              <input type="hidden" name="redirect" value={props.redirect} />

              {props.mode === "inscrire" && (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- SVG en data URI, pas une ressource distante */}
                  <img
                    src={props.qrCode}
                    alt="QR code à scanner avec votre application d'authentification"
                    width={180}
                    height={180}
                    className="bg-white rounded-lg p-2 border border-cream-deep"
                  />
                  <details className="text-center">
                    <summary className="text-[12px] text-warm-grey cursor-pointer hover:text-ink">
                      Impossible de scanner ? Saisir la clé manuellement
                    </summary>
                    <code className="block mt-2 text-[12.5px] tracking-[1.5px] text-ink break-all select-all">
                      {props.secret}
                    </code>
                  </details>
                </div>
              )}

              <div>
                <label htmlFor="code" className="block text-[12.5px] font-medium text-ink mb-1.5">
                  Code à six chiffres
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  className={`${inputClass} tracking-[6px] text-center text-[18px]`}
                />
              </div>

              {state.status === "error" && (
                <p className="text-[12.5px] text-red-600" role="alert">
                  {state.message}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full h-11 text-[13.5px] font-medium bg-ink text-cream rounded-lg hover:bg-navy disabled:opacity-60 transition-colors cursor-pointer"
              >
                {pending ? "Vérification..." : inscription ? "Activer" : "Valider"}
              </button>
            </form>
          </AnimateIn>
        )}

        <p className="mt-5 text-center text-[13px] text-warm-grey">
          <Link href="/connexion/equipe" className="text-bronze hover:text-bronze-dark font-medium">
            Revenir à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
