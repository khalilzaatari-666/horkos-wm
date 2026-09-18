"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { destinationAdmin } from "@/lib/landing";
import { requireStaff } from "@/lib/staff";

export interface MfaState {
  status: "idle" | "error";
  message?: string;
}

const schema = z.object({
  factorId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Le code comporte six chiffres."),
  redirect: z.string().max(500).optional(),
});

/**
 * Vérifie un code TOTP - à l'inscription (premier code, qui active le facteur)
 * comme à chaque connexion. Dans les deux cas Supabase élève la session en
 * aal2 et renvoie de nouveaux jetons, que le client SSR pose en cookies avant
 * la redirection.
 *
 * Le plafond par IP est le même que celui du mot de passe : un code à six
 * chiffres se devine en ~10⁶ essais, et Supabase n'en bloque qu'une partie.
 */
export async function verifierCodeMfa(
  _previous: MfaState,
  formData: FormData
): Promise<MfaState> {
  const parsed = schema.safeParse({
    factorId: formData.get("factorId"),
    code: formData.get("code"),
    redirect: formData.get("redirect") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  if (!(await rateLimit("mfa", { max: 5, windowSeconds: 60 }))) {
    return {
      status: "error",
      message: "Trop de tentatives. Patientez une minute avant de réessayer.",
    };
  }

  const supabase = await createClient();
  if (!(await requireStaff(supabase))) {
    return { status: "error", message: "Session expirée. Reconnectez-vous." };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code: parsed.data.code,
  });

  if (error) {
    return { status: "error", message: "Code incorrect ou expiré. Réessayez." };
  }

  redirect(destinationAdmin(parsed.data.redirect));
}
