"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { AnimateIn } from "@/components/ui/animate-in";

const REDIRECT_DELAY = 6;

interface RequestSentProps {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Shown once the demande is saved, then hands over to account creation with
 * everything prefilled. The account is an invitation, never a gate — the
 * conseiller already has the request whatever the visitor does next.
 */
export function RequestSent({ firstName, lastName, email }: RequestSentProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);

  const signupUrl = `/inscription?${new URLSearchParams({
    email,
    prenom: firstName,
    nom: lastName,
    origine: "rdv",
  })}`;

  useEffect(() => {
    router.prefetch(signupUrl);
  }, [router, signupUrl]);

  useEffect(() => {
    if (countdown <= 0) {
      router.push(signupUrl);
      return;
    }
    const id = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, router, signupUrl]);

  return (
    <AnimateIn variant="reveal-up">
      <div className="bg-cream border border-cream-deep rounded-lg p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="w-9 h-9 rounded-full bg-bronze/15 text-bronze-dark flex items-center justify-center shrink-0">
            <Check className="w-4.5 h-4.5" />
          </span>
          <h2 className="font-heading text-[21px] font-semibold text-ink leading-tight">
            Votre demande est envoyée
          </h2>
        </div>

        <p className="text-[13.5px] text-warm-grey leading-[1.65]">
          Un conseiller vous recontacte au plus vite, sous 24 à 48 heures, pour convenir
          d&apos;un créneau. Le premier rendez-vous est gratuit et sans engagement.
        </p>

        <div className="mt-6 pt-5 border-t border-cream-deep">
          <p className="text-[13.5px] text-ink leading-[1.6]">
            Nous vous emmenons maintenant vers la création de votre espace client, avec vos
            informations déjà remplies.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
            <Link
              href={signupUrl}
              className="inline-block px-[26px] py-[13px] text-[13.5px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors"
            >
              Créer mon espace client →
            </Link>
            <span className="text-[12.5px] text-warm-grey" aria-live="polite">
              Redirection dans {countdown} s
            </span>
          </div>

          <p className="text-[12.5px] text-warm-grey mt-4">
            <Link href="/" className="text-bronze hover:text-bronze-dark font-medium">
              Revenir à l&apos;accueil
            </Link>{" "}
            - votre demande est déjà partie.
          </p>
        </div>
      </div>
    </AnimateIn>
  );
}
