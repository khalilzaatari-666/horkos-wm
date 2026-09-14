import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Lit `.env.local` sans dépendance : Next le charge pour l'application, mais
 * Playwright tourne dans son propre processus. Ne sert qu'à sonder Supabase
 * avant un test (jamais à écrire dans la base depuis la suite).
 */
export function envLocal(): Record<string, string> {
  const out: Record<string, string> = {};
  let raw = "";
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

/** Vrai si la RPC `rate_limit_hit` (migration 015) existe sur le projet. */
export async function rateLimitRpcExists(): Promise<boolean> {
  const env = envLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const res = await fetch(`${url}/rest/v1/rpc/rate_limit_hit`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_key: "e2e-probe", p_max: 1000, p_window_seconds: 1 }),
  });
  return res.status !== 404;
}
