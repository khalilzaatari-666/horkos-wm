"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Check, X } from "lucide-react";

export default function InscriptionPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function getPasswordStrength(pw: string) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[a-zA-Z]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return score;
  }

  const strength = getPasswordStrength(password);
  const strengthLabel = ["", "Faible", "Faible", "Moyen", "Fort", "Très fort"][strength] || "";
  const strengthColor = ["", "#DC2626", "#DC2626", "#F59E0B", "#22C55E", "#16A34A"][strength] || "";

  function handleNameChange(value: string, setter: (v: string) => void) {
    if (value === "" || nameRegex.test(value)) {
      setter(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      setError("Le nom ne doit contenir que des lettres.");
      setLoading(false);
      return;
    }

    if (!emailRegex.test(email)) {
      setError("Veuillez entrer une adresse email valide.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      setLoading(false);
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Le mot de passe doit contenir au moins un chiffre.");
      setLoading(false);
      return;
    }

    if (!/[a-zA-Z]/.test(password)) {
      setError("Le mot de passe doit contenir au moins une lettre.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
      return;
    }

    // If email confirmation is required, redirect to confirmation page
    if (data.user && !data.session) {
      router.push(`/inscription/confirmation?email=${encodeURIComponent(email)}`);
      return;
    }

    router.push("/espace");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-ink">Créer un compte</h1>
          <p className="mt-2 text-warm-grey">
            Rejoignez Horkos Wealth Management
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continuer avec Google
        </Button>

        <div className="flex items-center gap-4 my-6">
          <Separator className="flex-1" />
          <span className="text-xs text-warm-grey uppercase">ou</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => handleNameChange(e.target.value, setFirstName)}
                placeholder="Prénom"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => handleNameChange(e.target.value, setLastName)}
                placeholder="Nom"
                required
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères, 1 chiffre, 1 lettre"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-grey hover:text-ink transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: password ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: i <= strength ? strengthColor : "#EFE7D8",
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className="text-xs transition-colors duration-300"
                    style={{ color: strengthColor }}
                  >
                    {strengthLabel}
                  </p>
                  <ul className="space-y-1 pb-1">
                    {[
                      { ok: password.length >= 8, label: "Au moins 8 caractères" },
                      { ok: /[a-zA-Z]/.test(password), label: "Au moins une lettre" },
                      { ok: /[0-9]/.test(password), label: "Au moins un chiffre" },
                      { ok: /[^a-zA-Z0-9]/.test(password), label: "Un caractère spécial (recommandé)" },
                    ].map((rule) => (
                      <li key={rule.label} className="flex items-center gap-1.5 text-xs">
                        {rule.ok ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-warm-grey" />
                        )}
                        <span className={rule.ok ? "text-green-600" : "text-warm-grey"}>
                          {rule.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <div className="relative mt-1.5">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-grey hover:text-ink transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-bronze hover:bg-bronze-dark text-white"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-warm-grey">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-bronze hover:text-bronze-dark font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
