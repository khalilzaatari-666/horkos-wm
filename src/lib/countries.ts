/**
 * Indicatifs téléphoniques internationaux.
 *
 * La liste est volontairement complète : une partie de la clientèle est
 * marocaine résidant à l'étranger, un choix limité au Maghreb et à l'Europe
 * laisserait des clients légitimes sans indicatif utilisable.
 *
 * Les drapeaux ne sont pas stockés — ils se déduisent du code ISO, deux
 * lettres converties en indicateurs régionaux Unicode.
 */

export interface Country {
  iso: string;
  name: string;
  dial: string;
}

/** Remontés en tête de liste : marchés principaux du cabinet. */
export const SUGGESTED_ISO = ["MA", "FR", "ES", "BE", "CH", "CA", "US", "AE", "GB", "DE"];

const DATA: [string, string, string][] = [
  ["AF", "Afghanistan", "+93"], ["ZA", "Afrique du Sud", "+27"], ["AL", "Albanie", "+355"],
  ["DZ", "Algérie", "+213"], ["DE", "Allemagne", "+49"], ["AD", "Andorre", "+376"],
  ["AO", "Angola", "+244"], ["AG", "Antigua-et-Barbuda", "+1268"], ["SA", "Arabie saoudite", "+966"],
  ["AR", "Argentine", "+54"], ["AM", "Arménie", "+374"], ["AU", "Australie", "+61"],
  ["AT", "Autriche", "+43"], ["AZ", "Azerbaïdjan", "+994"], ["BS", "Bahamas", "+1242"],
  ["BH", "Bahreïn", "+973"], ["BD", "Bangladesh", "+880"], ["BB", "Barbade", "+1246"],
  ["BE", "Belgique", "+32"], ["BZ", "Belize", "+501"], ["BJ", "Bénin", "+229"],
  ["BT", "Bhoutan", "+975"], ["BY", "Biélorussie", "+375"], ["BO", "Bolivie", "+591"],
  ["BA", "Bosnie-Herzégovine", "+387"], ["BW", "Botswana", "+267"], ["BR", "Brésil", "+55"],
  ["BN", "Brunei", "+673"], ["BG", "Bulgarie", "+359"], ["BF", "Burkina Faso", "+226"],
  ["BI", "Burundi", "+257"], ["KH", "Cambodge", "+855"], ["CM", "Cameroun", "+237"],
  ["CA", "Canada", "+1"], ["CV", "Cap-Vert", "+238"], ["CL", "Chili", "+56"],
  ["CN", "Chine", "+86"], ["CY", "Chypre", "+357"], ["CO", "Colombie", "+57"],
  ["KM", "Comores", "+269"], ["CG", "Congo", "+242"], ["CD", "Congo (RDC)", "+243"],
  ["KR", "Corée du Sud", "+82"], ["CR", "Costa Rica", "+506"], ["CI", "Côte d'Ivoire", "+225"],
  ["HR", "Croatie", "+385"], ["CU", "Cuba", "+53"], ["DK", "Danemark", "+45"],
  ["DJ", "Djibouti", "+253"], ["DM", "Dominique", "+1767"], ["EG", "Égypte", "+20"],
  ["AE", "Émirats arabes unis", "+971"], ["EC", "Équateur", "+593"], ["ER", "Érythrée", "+291"],
  ["ES", "Espagne", "+34"], ["EE", "Estonie", "+372"], ["SZ", "Eswatini", "+268"],
  ["US", "États-Unis", "+1"], ["ET", "Éthiopie", "+251"], ["FJ", "Fidji", "+679"],
  ["FI", "Finlande", "+358"], ["FR", "France", "+33"], ["GA", "Gabon", "+241"],
  ["GM", "Gambie", "+220"], ["GE", "Géorgie", "+995"], ["GH", "Ghana", "+233"],
  ["GR", "Grèce", "+30"], ["GD", "Grenade", "+1473"], ["GT", "Guatemala", "+502"],
  ["GN", "Guinée", "+224"], ["GQ", "Guinée équatoriale", "+240"], ["GW", "Guinée-Bissau", "+245"],
  ["GY", "Guyana", "+592"], ["HT", "Haïti", "+509"], ["HN", "Honduras", "+504"],
  ["HK", "Hong Kong", "+852"], ["HU", "Hongrie", "+36"], ["IN", "Inde", "+91"],
  ["ID", "Indonésie", "+62"], ["IQ", "Irak", "+964"], ["IR", "Iran", "+98"],
  ["IE", "Irlande", "+353"], ["IS", "Islande", "+354"], ["IL", "Israël", "+972"],
  ["IT", "Italie", "+39"], ["JM", "Jamaïque", "+1876"], ["JP", "Japon", "+81"],
  ["JO", "Jordanie", "+962"], ["KZ", "Kazakhstan", "+7"], ["KE", "Kenya", "+254"],
  ["KG", "Kirghizistan", "+996"], ["KI", "Kiribati", "+686"], ["KW", "Koweït", "+965"],
  ["LA", "Laos", "+856"], ["LS", "Lesotho", "+266"], ["LV", "Lettonie", "+371"],
  ["LB", "Liban", "+961"], ["LR", "Liberia", "+231"], ["LY", "Libye", "+218"],
  ["LI", "Liechtenstein", "+423"], ["LT", "Lituanie", "+370"], ["LU", "Luxembourg", "+352"],
  ["MK", "Macédoine du Nord", "+389"], ["MG", "Madagascar", "+261"], ["MY", "Malaisie", "+60"],
  ["MW", "Malawi", "+265"], ["MV", "Maldives", "+960"], ["ML", "Mali", "+223"],
  ["MT", "Malte", "+356"], ["MA", "Maroc", "+212"], ["MU", "Maurice", "+230"],
  ["MR", "Mauritanie", "+222"], ["MX", "Mexique", "+52"], ["MD", "Moldavie", "+373"],
  ["MC", "Monaco", "+377"], ["MN", "Mongolie", "+976"], ["ME", "Monténégro", "+382"],
  ["MZ", "Mozambique", "+258"], ["MM", "Myanmar", "+95"], ["NA", "Namibie", "+264"],
  ["NP", "Népal", "+977"], ["NI", "Nicaragua", "+505"], ["NE", "Niger", "+227"],
  ["NG", "Nigeria", "+234"], ["NO", "Norvège", "+47"], ["NZ", "Nouvelle-Zélande", "+64"],
  ["OM", "Oman", "+968"], ["UG", "Ouganda", "+256"], ["UZ", "Ouzbékistan", "+998"],
  ["PK", "Pakistan", "+92"], ["PA", "Panama", "+507"], ["PG", "Papouasie-Nouvelle-Guinée", "+675"],
  ["PY", "Paraguay", "+595"], ["NL", "Pays-Bas", "+31"], ["PE", "Pérou", "+51"],
  ["PH", "Philippines", "+63"], ["PL", "Pologne", "+48"], ["PF", "Polynésie française", "+689"],
  ["PT", "Portugal", "+351"], ["QA", "Qatar", "+974"], ["CF", "République centrafricaine", "+236"],
  ["DO", "République dominicaine", "+1809"], ["CZ", "République tchèque", "+420"],
  ["RO", "Roumanie", "+40"], ["GB", "Royaume-Uni", "+44"], ["RU", "Russie", "+7"],
  ["RW", "Rwanda", "+250"], ["KN", "Saint-Christophe-et-Niévès", "+1869"],
  ["SM", "Saint-Marin", "+378"], ["VC", "Saint-Vincent-et-les-Grenadines", "+1784"],
  ["LC", "Sainte-Lucie", "+1758"], ["SV", "Salvador", "+503"], ["WS", "Samoa", "+685"],
  ["ST", "Sao Tomé-et-Principe", "+239"], ["SN", "Sénégal", "+221"], ["RS", "Serbie", "+381"],
  ["SC", "Seychelles", "+248"], ["SL", "Sierra Leone", "+232"], ["SG", "Singapour", "+65"],
  ["SK", "Slovaquie", "+421"], ["SI", "Slovénie", "+386"], ["SO", "Somalie", "+252"],
  ["SD", "Soudan", "+249"], ["SS", "Soudan du Sud", "+211"], ["LK", "Sri Lanka", "+94"],
  ["SE", "Suède", "+46"], ["CH", "Suisse", "+41"], ["SR", "Suriname", "+597"],
  ["SY", "Syrie", "+963"], ["TJ", "Tadjikistan", "+992"], ["TW", "Taïwan", "+886"],
  ["TZ", "Tanzanie", "+255"], ["TD", "Tchad", "+235"], ["TH", "Thaïlande", "+66"],
  ["TL", "Timor oriental", "+670"], ["TG", "Togo", "+228"], ["TO", "Tonga", "+676"],
  ["TT", "Trinité-et-Tobago", "+1868"], ["TN", "Tunisie", "+216"], ["TM", "Turkménistan", "+993"],
  ["TR", "Turquie", "+90"], ["UA", "Ukraine", "+380"], ["UY", "Uruguay", "+598"],
  ["VU", "Vanuatu", "+678"], ["VE", "Venezuela", "+58"], ["VN", "Viêt Nam", "+84"],
  ["YE", "Yémen", "+967"], ["ZM", "Zambie", "+260"], ["ZW", "Zimbabwe", "+263"],
];

/**
 * Longueur du numéro national, préfixe interurbain (le 0) exclu.
 *
 * Renseigné uniquement pour les marchés du cabinet, là où la donnée est sûre.
 * Tout pays absent retombe sur une fourchette permissive : mieux vaut laisser
 * passer un numéro atypique que d'en refuser un valide.
 */
const NATIONAL_LENGTHS: Record<string, number[]> = {
  MA: [9],
  DZ: [9],
  TN: [8],
  FR: [9],
  ES: [9],
  BE: [8, 9],
  CH: [9],
  PT: [9],
  NL: [9],
  LU: [9],
  MC: [8],
  GB: [9, 10],
  CA: [10],
  US: [10],
  AE: [8, 9],
  SA: [9],
  QA: [8],
  KW: [8],
  BH: [8],
  OM: [8],
  SN: [9],
  EG: [10],
};

export const COUNTRIES: Country[] = DATA.map(([iso, name, dial]) => ({ iso, name, dial })).sort(
  (a, b) => a.name.localeCompare(b.name, "fr")
);

/** Longueurs attendues pour un pays, ou null si non renseigné. */
export function nationalLengths(iso: string): number[] | null {
  return NATIONAL_LENGTHS[iso.toUpperCase()] ?? null;
}

/**
 * Longueurs attendues pour un indicatif, côté serveur, où seul le numéro
 * composé est disponible. Plusieurs pays peuvent partager un indicatif (+1),
 * on accepte donc l'union de leurs longueurs.
 */
export function nationalLengthsForDial(dial: string): number[] | null {
  const lengths = new Set<number>();
  for (const country of COUNTRIES) {
    if (country.dial !== dial) continue;
    const known = NATIONAL_LENGTHS[country.iso];
    if (!known) return null; // un pays de cet indicatif n'est pas renseigné
    known.forEach((n) => lengths.add(n));
  }
  return lengths.size > 0 ? [...lengths].sort((a, b) => a - b) : null;
}

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

export const DEFAULT_ISO = "MA";

export function getCountry(iso: string): Country {
  return BY_ISO.get(iso) ?? BY_ISO.get(DEFAULT_ISO)!;
}

/**
 * Découpe un numéro stocké (« +212 612345678 ») en pays et numéro national,
 * l'inverse de `composePhone`.
 *
 * L'indicatif le plus long l'emporte : +1 et +212 commencent tous deux par « 1 »
 * ou « 2 », et retenir la première correspondance rattacherait des numéros au
 * mauvais pays. Quand plusieurs pays partagent l'indicatif (+1), on prend celui
 * des pays suggérés s'il y figure — le cabinet est marocain, ses clients
 * canadiens sont plus probables que ceux d'une petite île des Caraïbes.
 */
export function splitPhone(stored: string | null | undefined): {
  iso: string;
  national: string;
} {
  const value = (stored ?? "").trim();
  if (!value.startsWith("+")) return { iso: DEFAULT_ISO, national: "" };

  const digits = value.slice(1).replace(/\D/g, "");
  let best: Country | null = null;

  for (const country of COUNTRIES) {
    const dial = country.dial.replace(/\D/g, "");
    if (!dial || !digits.startsWith(dial)) continue;
    if (best && dial.length <= best.dial.replace(/\D/g, "").length) {
      const isBetter = SUGGESTED_ISO.includes(country.iso) && !SUGGESTED_ISO.includes(best.iso);
      if (!isBetter) continue;
    }
    best = country;
  }

  if (!best) return { iso: DEFAULT_ISO, national: digits };

  return {
    iso: best.iso,
    national: digits.slice(best.dial.replace(/\D/g, "").length),
  };
}

/** "MA" -> 🇲🇦 : each letter maps to its regional indicator symbol. */
export function flagOf(iso: string): string {
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

/** Accent- and case-insensitive, so "senegal" finds "Sénégal". */
export function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
