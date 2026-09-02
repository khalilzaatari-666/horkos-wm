"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AnimateIn } from "@/components/ui/animate-in";

export default function ConnexionEquipePage() {
  return (
    <Suspense>
      <ConnexionEquipeForm />
    </Suspense>
  );
}

const inputClass =
  "w-full h-11 px-3.5 text-[14px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";

/**
 * Password fallback kept for admin and conseiller only.
 *
 * Clients sign in with a code or a provider. Staff keep this route so a mail
 * delivery outage can never lock the back-office out.
 */
function ConnexionEquipeForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    // `signInWithPassword` rend la main dès la réponse du serveur, alors que la
    // session est écrite dans le cookie par l'adaptateur de stockage, un cran
    // plus tard. `getSession` prend le même verrou : en sortir garantit que le
    // cookie existe. Sans cette attente, la navigation part avant lui, le proxy
    // ne voit personne et renvoie ici - on reste sur cette page, bouton figé.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("La session n'a pas pu être ouverte. Réessayez.");
      setLoading(false);
      return;
    }

    // Un compte client qui se trompe de formulaire serait sinon renvoyé vers
    // son espace par le proxy, sans un mot d'explication.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    const staff = profile?.role === "admin" || profile?.role === "conseiller";

    // Navigation complète et non `router.push` : le proxy et le layout doivent
    // relire les cookies côté serveur, et un `router.refresh` lancé dans la
    // foulée d'un `push` annule la navigation en cours.
    window.location.assign(staff ? redirect : "/espace");
  }

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
            onSubmit={handleSubmit}
            className="bg-cream border border-cream-deep rounded-lg p-6 space-y-4"
          >
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {error && <p className="text-[12.5px] text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-[13.5px] font-medium bg-ink text-cream rounded-lg hover:bg-navy disabled:opacity-60 transition-colors cursor-pointer"
            >
              {loading ? "Connexion..." : "Se connecter"}
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
