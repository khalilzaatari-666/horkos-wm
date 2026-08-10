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
    <div className="flex justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <AnimateIn variant="blur-in" duration={0.5}>
            <h1 className="font-heading text-[26px] font-semibold text-ink">
              Créer votre espace client
            </h1>
          </AnimateIn>
          <AnimateIn variant="fade-up" delay={150}>
            <p className="mt-2 text-[13.5px] text-warm-grey leading-[1.6]">
              {fromRdv
                ? "Votre demande de rendez-vous est bien enregistrée. Activez votre espace pour suivre votre dossier."
                : "Suivez votre dossier, retrouvez vos documents et échangez avec votre conseiller."}
            </p>
          </AnimateIn>
        </div>

        <AnimateIn variant="fade-up" delay={250}>
          <div className="bg-cream border border-cream-deep rounded-lg p-6">
            <ProviderButtons />

            <div className="flex items-center gap-3 my-5">
              <span className="flex-1 h-px bg-cream-deep" />
              <span className="text-[11px] text-warm-grey uppercase tracking-[1.2px]">ou</span>
              <span className="flex-1 h-px bg-cream-deep" />
            </div>

            <EmailCodeForm
              mode="signup"
              defaultEmail={email}
              defaultFirstName={firstName}
              defaultLastName={lastName}
            />
          </div>
        </AnimateIn>

        <p className="mt-5 text-center text-[13px] text-warm-grey">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-bronze hover:text-bronze-dark font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
