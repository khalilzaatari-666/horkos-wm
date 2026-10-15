import "server-only";

/**
 * Vérification d'un numéro par code SMS, via Twilio Verify : Twilio génère le
 * code, l'envoie, le fait expirer (10 min) et plafonne les essais (5). Deux
 * appels REST, pas de SDK.
 *
 * Tant que Twilio n'est pas configuré, l'étape SMS n'existe pas : le lecteur
 * laisse ses coordonnées et le contenu s'ouvre aussitôt, numéro non vérifié.
 * Poser les trois variables d'environnement suffit à l'activer.
 */

function config() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_VERIFY_SERVICE_SID;
  return sid && token && service ? { sid, token, service } : null;
}

/** L'étape du code SMS est-elle active ? */
export function smsActif(): boolean {
  return config() !== null;
}

/** `+212 612345678` (format de `composePhone`) → `+212612345678` (E.164). */
export function toE164(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

async function verify(path: string, body: Record<string, string>): Promise<{ status?: string } | null> {
  const c = config();
  if (!c) return null;
  try {
    const res = await fetch(`https://verify.twilio.com/v2/Services/${c.service}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${c.sid}:${c.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    });
    // 404 sur VerificationCheck : aucun code en cours (expiré ou épuisé).
    if (!res.ok) {
      console.warn(`[sms] Twilio ${path} : ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[sms] Twilio ${path} injoignable`, e);
    return null;
  }
}

/** Envoie un code au numéro. Rend false si l'envoi n'est pas parti. */
export async function sendCode(phone: string): Promise<boolean> {
  const r = await verify("Verifications", { To: toE164(phone), Channel: "sms", Locale: "fr" });
  return r?.status === "pending";
}

/** Rend true si le code saisi est le bon pour ce numéro. */
export async function checkCode(phone: string, code: string): Promise<boolean> {
  const r = await verify("VerificationCheck", { To: toE164(phone), Code: code });
  return r?.status === "approved";
}
