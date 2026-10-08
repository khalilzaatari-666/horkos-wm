"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProviderButtons } from "@/components/auth/provider-buttons";
import { EmailCodeForm } from "@/components/auth/email-code-form";
import { AnimateIn } from "@/components/ui/animate-in";

export default function InscriptionPage() {
  return (
    <Suspense>
      <InscriptionContent />
    </Suspense>
  );
}

function InscriptionContent() {
  const searchParams = useSearchParams();

  // Prefilled when the visitor arrives from the rendez-vous questionnaire.
  const email = searchParams.get("email") ?? "";
  const firstName = searchParams.get("prenom") ?? "";
  const lastName = searchParams.get("nom") ?? "";
  const fromRdv = searchParams.get("origine") === "rdv";

  return (
    <div className="flex justify-center lg:justify-start">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <AnimateIn variant="blur-in" duration={0.5}>
            <h1 className="display-lg text-ink">
              Créer votre espace client
            </h1>
          </AnimateIn>
          <AnimateIn variant="fade-up" delay={150}>
            <p className="mt-3 text-[16px] text-charcoal leading-relaxed">
              {fromRdv
                ? "Votre demande de rendez-vous est bien enregistrée. Activez votre espace pour suivre votre dossier."
                : "Suivez votre dossier, retrouvez vos documents et échangez avec votre conseiller."}
            </p>
          </AnimateIn>
        </div>

        <AnimateIn variant="fade-up" delay={250}>
          <div className="surface p-6 sm:p-8">
            <ProviderButtons />

            <div className="flex items-center gap-3 my-5">
              <span className="flex-1 h-px bg-ink/10" />
              <span className="text-[13px] text-warm-grey">ou</span>
              <span className="flex-1 h-px bg-ink/10" />
            </div>

            <EmailCodeForm
              mode="signup"
              defaultEmail={email}
              defaultFirstName={firstName}
              defaultLastName={lastName}
            />
          </div>
        </AnimateIn>

        <p className="mt-6 text-[15px] text-warm-grey">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-ink underline decoration-ink/30 hover:decoration-ink font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
