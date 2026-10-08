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
    <div className="flex justify-center lg:justify-start">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <AnimateIn variant="blur-in" duration={0.5}>
            <h1 className="display-lg text-ink">Connexion</h1>
          </AnimateIn>
          <AnimateIn variant="fade-up" delay={150}>
            <p className="mt-3 text-[16px] text-charcoal">Accédez à votre espace client.</p>
          </AnimateIn>
        </div>

        <AnimateIn variant="fade-up" delay={250}>
          <div className="surface p-6 sm:p-8">
            {authError && (
              <p className="text-[12.5px] text-red-600 mb-4">
                La connexion n’a pas abouti. Réessayez.
              </p>
            )}

            <ProviderButtons redirectTo={redirect} />

            <div className="flex items-center gap-3 my-5">
              <span className="flex-1 h-px bg-ink/10" />
              <span className="text-[13px] text-warm-grey">ou</span>
              <span className="flex-1 h-px bg-ink/10" />
            </div>

            <EmailCodeForm mode="login" redirectTo={redirect} />
          </div>
        </AnimateIn>

        <p className="mt-6 text-[15px] text-warm-grey">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-ink underline decoration-ink/30 hover:decoration-ink font-medium">
            Créer un espace client
          </Link>
        </p>

        <p className="mt-3 text-[14px] text-warm-grey">
          <Link href="/connexion/equipe" className="hover:text-ink transition-colors">
            Accès équipe Horkos
          </Link>
        </p>
      </div>
    </div>
  );
}
