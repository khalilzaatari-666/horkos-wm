import "server-only";

/**
 * Statistiques de fréquentation - lues depuis l'instance Umami auto-hébergée
 * (projet Vercel + Postgres Neon séparés, cf. plan Sprint 5). L'édition
 * self-hosted n'a pas de clé API statique : on s'authentifie comme le ferait
 * l'UI, via login, et on porte le jeton reçu sur l'appel de statistiques.
 * Identifiants et URL de l'instance restent côté serveur - seuls l'ID de site
 * et l'URL du script de tracking, publics par nature, atteignent le client.
 *
 * Contrat d'échec identique à `google-calendar.ts` : une panne, un login
 * refusé ou une configuration absente rend `null` et se contente d'un log. Le
 * tableau de bord ne doit jamais tomber pour une histoire d'analytics.
 */

const TIMEOUT_MS = 5000;

/**
 * Forme réellement rendue par l'API 3.3.1 : des compteurs plats pour la
 * période demandée, et un objet `comparison` à part pour la période
 * précédente de même durée - pas la forme `{value, prev}` par métrique de la
 * v2, sur laquelle la documentation générale prête à confusion.
 */
export interface UmamiStats {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
  comparison: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
}

function config() {
  const apiUrl = process.env.UMAMI_API_URL;
  const username = process.env.UMAMI_USERNAME;
  const password = process.env.UMAMI_PASSWORD;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!apiUrl || !username || !password || !websiteId) return null;
  return { apiUrl: apiUrl.replace(/\/$/, ""), username, password, websiteId };
}

export function umamiConfigured(): boolean {
  return config() !== null;
}

/**
 * Le jeton n'est jamais mis en cache : une instance serverless n'offre aucune
 * garantie de survivre d'un appel à l'autre, et le login est bon marché.
 */
async function login(apiUrl: string, username: string, password: string): Promise<string | null> {
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("[umami] connexion refusée:", response.status, await response.text());
    return null;
  }

  const { token } = (await response.json()) as { token?: string };
  return token ?? null;
}

/**
 * Fenêtre de 30 jours contre les 30 précédents. Umami calcule lui-même la
 * comparaison sur la période immédiatement antérieure de même durée - on ne
 * fait donc qu'une requête de stats, pas deux.
 */
export async function getUmamiStats30j(now = new Date()): Promise<UmamiStats | null> {
  const conf = config();
  if (!conf) return null;

  try {
    const token = await login(conf.apiUrl, conf.username, conf.password);
    if (!token) return null;

    const JOUR = 86_400_000;
    const endAt = now.getTime();
    const startAt = endAt - 30 * JOUR;

    const url = `${conf.apiUrl}/api/websites/${conf.websiteId}/stats?startAt=${startAt}&endAt=${endAt}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Le tableau de bord se recharge à chaque visite ; cinq minutes de cache
      // évitent de solliciter l'instance Umami à chaque rafraîchissement.
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error("[umami] statistiques refusées:", response.status, await response.text());
      return null;
    }

    return (await response.json()) as UmamiStats;
  } catch (error) {
    console.error("[umami] statistiques indisponibles:", error);
    return null;
  }
}
