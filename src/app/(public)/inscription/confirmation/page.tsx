"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-cream-deep flex items-center justify-center mb-6">
          <Mail className="h-8 w-8 text-bronze" />
        </div>
        <h1 className="text-3xl font-semibold text-ink">Vérifiez votre email</h1>
        <p className="mt-4 text-warm-grey leading-relaxed">
          Un email de confirmation a été envoyé à{" "}
          {email ? (
            <span className="font-medium text-ink">{email}</span>
          ) : (
            "votre adresse email"
          )}
          . Cliquez sur le lien dans l&apos;email pour activer votre compte.
        </p>
        <p className="mt-4 text-sm text-warm-grey">
          Vous n&apos;avez pas reçu l&apos;email ? Vérifiez votre dossier spam.
        </p>
        <Link href="/connexion" className="inline-block mt-8 px-6 py-2.5 border border-ink rounded-lg text-sm font-medium hover:bg-ink hover:text-cream transition-colors">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
