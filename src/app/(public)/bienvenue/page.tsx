import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = {
  title: "Bienvenue",
  // Page de première connexion : rien à indexer.
  robots: { index: false, follow: false },
};

export default async function BienvenuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // On arrive ici par le lien d'invitation, donc avec une session déjà établie
  // par /auth/callback. Sans session, le lien a expiré ou a déjà servi.
  if (!user) redirect("/connexion/equipe");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <AnimateIn variant="blur-in" duration={0.5}>
          <div className="text-center mb-7">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Première connexion
            </span>
            <h1 className="font-heading text-[clamp(1.5rem,4vw,1.8rem)] font-semibold text-ink mt-2.5 leading-[1.3]">
              Bienvenue{profile?.first_name ? `, ${profile.first_name}` : ""}
            </h1>
            <p className="text-[13.5px] text-warm-grey leading-[1.65] mt-2.5">
              Choisissez votre mot de passe. Il vous servira à vous connecter au back-office sur la
              page de connexion équipe.
            </p>
          </div>
        </AnimateIn>

        <AnimateIn variant="fade-up" delay={120}>
          <div className="bg-cream border border-cream-deep rounded-lg p-6 sm:p-7">
            <SetPasswordForm />
          </div>
        </AnimateIn>

        {profile && profile.role !== "admin" && profile.role !== "conseiller" && (
          <p className="text-[12.5px] text-warm-grey leading-[1.6] mt-4 text-center">
            Votre compte n&apos;a pas encore de rôle équipe. Une fois le mot de passe défini,
            contactez l&apos;administrateur qui vous a invité.
          </p>
        )}
      </div>
    </div>
  );
}
