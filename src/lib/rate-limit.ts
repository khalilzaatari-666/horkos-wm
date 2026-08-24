import "server-only";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Limitation de débit des actions publiques, adossée à Postgres (voir la
 * migration 015). La clé est « action + IP » : un visiteur ne peut déclencher
 * une action qu'un nombre limité de fois par fenêtre.
 *
 * Contrat d'échec : fail-open. En cas d'erreur (RPC absente, base injoignable),
 * on autorise l'action - mieux vaut ne pas bloquer un vrai visiteur qu'ériger la
 * limitation en point de panne. La protection reste effective en régime normal.
 */
export interface RateLimitOptions {
  /** Nombre d'appels autorisés sur la fenêtre. */
  max: number;
  /** Durée de la fenêtre, en secondes. */
  windowSeconds: number;
}

/** Rend true si l'appel est dans les limites, false s'il doit être bloqué. */
export async function rateLimit(action: string, opts: RateLimitOptions): Promise<boolean> {
  try {
    const ip = await clientIp();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_key: `${action}:${ip}`,
      p_max: opts.max,
      p_window_seconds: opts.windowSeconds,
    });
    if (error) return true; // fail-open
    return data !== false; // la RPC rend un booléen ; true = autorisé
  } catch {
    return true; // fail-open
  }
}

/** IP du client derrière le proxy Vercel. `x-forwarded-for` peut lister une
 *  chaîne de proxys : la première entrée est l'IP d'origine. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
