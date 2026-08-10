"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProviderButtons } from "@/components/auth/provider-buttons";
import { EmailCodeForm } from "@/components/auth/email-code-form";
import { AnimateIn } from "@/components/ui/animate-in";

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionContent />
    </Suspense>
  );
}

function ConnexionContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/espace";
  const authError = searchParams.get("error") === "auth";

  return (
    <div className="flex justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <AnimateIn variant="blur-in" duration={0.5}>
            <h1 className="font-heading text-[26px] font-semibold text-ink">Connexion</h1>
          </AnimateIn>
          <AnimateIn variant="fade-up" delay={150}>
            <p className="mt-2 text-[13.5px] text-warm-grey">Accédez à votre espace client.</p>
          </AnimateIn>
        </div>

        <AnimateIn variant="fade-up" delay={250}>
          <div className="bg-cream border border-cream-deep rounded-lg p-6">
            {authError && (
              <p className="text-[12.5px] text-red-600 mb-4">
                La connexion n&apos;a pas abouti. Réessayez.
              </p>
            )}

            <ProviderButtons redirectTo={redirect} />

            <div className="flex items-center gap-3 my-5">
              <span className="flex-1 h-px bg-cream-deep" />
              <span className="text-[11px] text-warm-grey uppercase tracking-[1.2px]">ou</span>
              <span className="flex-1 h-px bg-cream-deep" />
            </div>

            <EmailCodeForm mode="login" redirectTo={redirect} />
          </div>
        </AnimateIn>

        <p className="mt-5 text-center text-[13px] text-warm-grey">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-bronze hover:text-bronze-dark font-medium">
            Créer un espace client
          </Link>
        </p>

        <p className="mt-3 text-center text-[11.5px] text-warm-grey">
          <Link href="/connexion/equipe" className="hover:text-ink transition-colors">
            Accès équipe Horkos
          </Link>
        </p>
      </div>
    </div>
  );
}
