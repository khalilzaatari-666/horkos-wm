"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { AnimateIn } from "@/components/ui/animate-in";
import { seConnecterEquipe, type ConnexionEquipeState } from "./actions";

export default function ConnexionEquipePage() {
  return (
    <Suspense>
      <ConnexionEquipeForm />
    </Suspense>
  );
}

const inputClass =
  "w-full h-11 px-3.5 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

const initialState: ConnexionEquipeState = { status: "idle" };

/**
 * Password fallback kept for admin and conseiller only.
 *
 * Clients sign in with a code or a provider. Staff keep this route so a mail
 * delivery outage can never lock the back-office out.
 *
 * La connexion passe par une server action (voir `./actions.ts`) : c'est elle
 * qui limite les tentatives par IP et pose le cookie de session avant de
 * rediriger - plus besoin d'attendre le cookie côté navigateur.
 */
function ConnexionEquipeForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  const [state, formAction, pending] = useActionState(seConnecterEquipe, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <AnimateIn variant="blur-in" duration={0.5}>
            <span className="text-bronze-dark text-[11px] font-semibold tracking-[1.6px] uppercase">
              Accès réservé
            </span>
            <h1 className="font-heading text-[26px] font-semibold text-ink mt-1.5">
              Équipe Horkos
            </h1>
          </AnimateIn>
          <AnimateIn variant="fade-up" delay={150}>
            <p className="mt-2 text-[13.5px] text-warm-grey leading-[1.6]">
              Connexion par mot de passe pour les administrateurs et conseillers.
            </p>
          </AnimateIn>
        </div>

        <AnimateIn variant="fade-up" delay={250}>
          <form
            action={formAction}
            className="bg-cream border border-cream-deep rounded-lg p-6 space-y-4"
          >
            <input type="hidden" name="redirect" value={redirect} />

            <div>
              <label htmlFor="email" className="block text-[12.5px] font-medium text-ink mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[12.5px] font-medium text-ink mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-grey hover:text-ink transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
              {pending ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </AnimateIn>

        <p className="mt-5 text-center text-[13px] text-warm-grey">
          Vous êtes client ?{" "}
          <Link href="/connexion" className="text-bronze hover:text-bronze-dark font-medium">
            Connexion par code
          </Link>
        </p>
      </div>
    </div>
  );
}
