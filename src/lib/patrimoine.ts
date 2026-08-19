/**
 * Agrégations du patrimoine client.
 *
 * Isolé des composants pour être vérifiable seul : ce sont des chiffres que le
 * client verra et sur lesquels un conseiller s'engagera.
 */

export interface AssetRow {
  id: string;
  type: string;
  label: string;
  value: number;
}

export interface ValuationRow {
  asset_id: string;
  value: number;
  /** Date ISO `YYYY-MM-DD`. */
  valued_at: string;
}

export interface AssetClass {
  type: string;
  label: string;
  total: number;
  /** Part du patrimoine, en pourcentage, arrondie à une décimale. */
  share: number;
  count: number;
}

/** Libellés des types d'actifs. Un type inconnu s'affiche tel quel. */
const TYPE_LABELS: Record<string, string> = {
  immobilier: "Immobilier",
  assurance_vie: "Assurance-vie",
  opcvm: "OPCVM",
  actions: "Actions",
  obligations: "Obligations",
  liquidites: "Liquidités",
  private_equity: "Private Equity",
  participation: "Participations",
  autre: "Autre",
};

export function assetTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function totalPatrimoine(assets: AssetRow[]): number {
  return assets.reduce((sum, a) => sum + (a.value || 0), 0);
}

/**
 * Répartition par classe d'actifs, de la plus grosse à la plus petite.
 *
 * Les parts sont arrondies à une décimale, puis le reste d'arrondi est reporté
 * sur la plus grosse classe : sans ça les pourcentages affichés totalisent
 * 99,9 % ou 100,1 %, ce qu'un client remarque immédiatement.
 */
export function repartition(assets: AssetRow[]): AssetClass[] {
  const total = totalPatrimoine(assets);
  if (total <= 0) return [];

  const byType = new Map<string, { total: number; count: number }>();
  for (const asset of assets) {
    const entry = byType.get(asset.type) ?? { total: 0, count: 0 };
    entry.total += asset.value || 0;
    entry.count += 1;
    byType.set(asset.type, entry);
  }

  const classes = [...byType.entries()]
    .map(([type, { total: classTotal, count }]) => ({
      type,
      label: assetTypeLabel(type),
      total: classTotal,
      count,
      share: Math.round((classTotal / total) * 1000) / 10,
    }))
    .sort((a, b) => b.total - a.total);

  const drift = Math.round((100 - classes.reduce((s, c) => s + c.share, 0)) * 10) / 10;
  if (drift !== 0 && classes.length > 0) {
    classes[0].share = Math.round((classes[0].share + drift) * 10) / 10;
  }

  return classes;
}

/** En deçà, une classe dominante n'a rien d'anormal et le signaler serait du bruit. */
const CONCENTRATION_THRESHOLD = 45;

/**
 * La classe qui pèse le plus, si elle dépasse le seuil.
 *
 * Formulé comme un constat, jamais comme une alerte : un verdict de risque
 * calculé automatiquement et présenté à un client est précisément ce qu'un
 * contrôle AMMC demanderait de justifier. C'est au conseiller de qualifier.
 *
 * Sans objet quand une seule classe existe — « 100 % sur une seule classe »
 * n'apprend rien à qui ne détient qu'un actif.
 */
export function concentration(classes: AssetClass[]): AssetClass | null {
  if (classes.length < 2) return null;
  const first = classes[0];
  return first && first.share >= CONCENTRATION_THRESHOLD ? first : null;
}

export interface Performance {
  /** Variation en pourcentage, ou `null` si l'historique ne permet pas de conclure. */
  percent: number | null;
  /** Date du point de comparaison retenu, ISO `YYYY-MM-DD`. */
  since: string | null;
  /** Nombre d'actifs pour lesquels un point de comparaison a été trouvé. */
  covered: number;
}

/** Tolérance autour des 12 mois, en jours, pour retenir un relevé. */
const WINDOW_DAYS = 75;
const DAY_MS = 86_400_000;

/**
 * Performance sur douze mois, pondérée par la valeur des actifs.
 *
 * Pour chaque actif on cherche le relevé le plus proche de la date d'il y a un
 * an, dans une fenêtre de ± 75 jours — un relevé trimestriel ne tombe jamais
 * pile. Les actifs sans point de comparaison sont exclus des DEUX côtés du
 * rapport : les inclure au numérateur seulement gonflerait artificiellement la
 * performance d'un patrimoine récemment enrichi.
 *
 * Retourne `percent: null` plutôt que zéro quand rien n'est comparable — un
 * zéro se lit comme « stable », ce qui serait un chiffre inventé.
 */
export function performance12m(
  assets: AssetRow[],
  valuations: ValuationRow[],
  now: Date = new Date()
): Performance {
  const target = now.getTime() - 365 * DAY_MS;

  const byAsset = new Map<string, ValuationRow[]>();
  for (const v of valuations) {
    const list = byAsset.get(v.asset_id);
    if (list) list.push(v);
    else byAsset.set(v.asset_id, [v]);
  }

  let current = 0;
  let past = 0;
  let covered = 0;
  let since: string | null = null;
  let sinceDistance = Infinity;

  for (const asset of assets) {
    const history = byAsset.get(asset.id);
    if (!history?.length) continue;

    let best: ValuationRow | null = null;
    let bestDistance = Infinity;
    for (const v of history) {
      const distance = Math.abs(new Date(v.valued_at).getTime() - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = v;
      }
    }

    if (!best || bestDistance > WINDOW_DAYS * DAY_MS) continue;

    current += asset.value || 0;
    past += best.value || 0;
    covered += 1;

    if (bestDistance < sinceDistance) {
      sinceDistance = bestDistance;
      since = best.valued_at;
    }
  }

  if (covered === 0 || past <= 0) return { percent: null, since: null, covered: 0 };

  return {
    percent: Math.round((current / past - 1) * 1000) / 10,
    since,
    covered,
  };
}

/** « 4,25M MAD » — les montants patrimoniaux se lisent en ordre de grandeur. */
export function formatMAD(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    // Une décimale sous 100M, aucune au-delà : « 125M » plutôt que « 125,4M ».
    const digits = abs >= 100_000_000 ? 0 : 2;
    return `${trimZeros(millions.toFixed(digits))}M MAD`;
  }
  if (abs >= 1_000) {
    return `${trimZeros((value / 1_000).toFixed(0))}k MAD`;
  }
  return `${value.toFixed(0)} MAD`;
}

/**
 * Retire les décimales inutiles : « 3,00 » → « 3 », « 4,25 » inchangé.
 *
 * Le test d'appartenance au point décimal n'est pas décoratif : sans lui,
 * « 450 » devenait « 45 », le zéro final étant pris pour une décimale morte.
 */
function trimZeros(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "").replace(".", ",");
}

/** « +6,8 % » / « -2,1 % ». Le signe est porteur d'information, on le garde. */
export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")} %`;
}
