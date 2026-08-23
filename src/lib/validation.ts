import { nationalLengthsForDial } from "@/lib/countries";

/**
 * Field validators shared by the forms and their server actions.
 *
 * The browser check is only there to give immediate feedback - the server one
 * is what actually protects the data. Both live here so a rule can't be
 * tightened on one side and forgotten on the other.
 */

/** Letters, then optional groups separated by a single space, apostrophe or hyphen.
 *  The ranges skip U+00D7 (×) and U+00F7 (÷), which sit inside a naive À-ÿ span. */
export const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The national part only - the dial code comes from the country picker.
 *  Deliberately permissive on grouping: numbering plans differ from one
 *  country to the next and many clients live abroad. */
export const PHONE_NATIONAL_REGEX = /^[\d\s().-]+$/;

/** The composed value stored in the database: "+212 612345678". */
export const PHONE_FULL_REGEX = /^\+\d{1,4}\s\d{6,14}$/;

export const NAME_MAX = 60;
export const EMAIL_MAX = 200;
export const PHONE_MAX = 25;
export const MESSAGE_MAX = 2000;
export const BESOIN_AUTRE_MAX = 300;

/** Anything that can't appear in a name, stripped as it is typed or pasted. */
const NAME_DISALLOWED = /[^A-Za-zÀ-ÖØ-öø-ÿ '-]/g;

/**
 * Keeps digits and punctuation out of a name field at the source.
 *
 * Filtering on input rather than only on submit means the visitor never sees
 * an error for something the form could simply have refused to accept.
 */
export function sanitizeName(value: string): string {
  return value.replace(NAME_DISALLOWED, "");
}

/**
 * Raises the first letter of each part of a name.
 *
 * Only a lowercase letter sitting at the start or just after a separator is
 * touched - nothing else is altered, so "McDonald" and "d'ARTAGNAN" keep the
 * casing they were given.
 */
export function capitaliseName(value: string): string {
  return value.replace(
    /(^|[ '-])([a-zà-öø-ÿ])/g,
    (_, separator: string, letter: string) => separator + letter.toUpperCase()
  );
}

/** What the name inputs run on every keystroke and on paste. */
export function formatNameInput(value: string): string {
  return capitaliseName(sanitizeName(value));
}

export function validateName(value: string, label: string): string | null {
  const v = value.trim();
  if (!v) return `${label} est obligatoire.`;
  if (v.length < 2) return `${label} est trop court.`;
  if (v.length > NAME_MAX) return `${label} est trop long.`;
  if (!NAME_REGEX.test(v)) return `${label} ne doit contenir que des lettres.`;
  return null;
}

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return "L'adresse email est obligatoire.";
  if (v.length > EMAIL_MAX) return "L'adresse email est trop longue.";
  if (!EMAIL_REGEX.test(v)) return "Veuillez entrer une adresse email valide, par exemple nom@domaine.com.";
  return null;
}

/** Significant digits: separators dropped, trunk prefix dropped. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+/, "");
}

function lengthError(digits: string, expected: number[] | null): string | null {
  if (expected) {
    if (expected.includes(digits.length)) return null;
    const list =
      expected.length === 1
        ? `${expected[0]} chiffres`
        : `${expected.slice(0, -1).join(", ")} ou ${expected[expected.length - 1]} chiffres`;
    return `Ce numéro doit compter ${list}, vous en avez saisi ${digits.length}.`;
  }
  // Country without a known plan: only reject the obviously impossible.
  if (digits.length < 6) return "Le numéro est trop court.";
  if (digits.length > 14) return "Le numéro est trop long.";
  return null;
}

/**
 * Validates what the visitor types, without the dial code.
 *
 * `expectedLengths` comes from the selected country, so a Moroccan number is
 * only accepted at exactly 9 digits rather than at any plausible length.
 */
export function validatePhoneNational(
  value: string,
  expectedLengths: number[] | null = null
): string | null {
  const v = value.trim();
  if (!v) return "Le numéro de téléphone est obligatoire.";
  if (v.length > PHONE_MAX) return "Le numéro est trop long.";
  if (!PHONE_NATIONAL_REGEX.test(v)) {
    return "Le numéro ne doit contenir que des chiffres, espaces et les signes ( ) . -";
  }
  return lengthError(phoneDigits(v), expectedLengths);
}

/**
 * Joins the dial code and the national number into what gets stored.
 *
 * The leading zero is a national trunk prefix - "06 12 34 56 78" dialled from
 * abroad is "+212 612345678", not "+212 0612345678". Dropping it here means
 * the stored number is always callable as-is.
 */
export function composePhone(dialCode: string, nationalNumber: string): string {
  const digits = nationalNumber.replace(/\D/g, "").replace(/^0+/, "");
  return `${dialCode} ${digits}`;
}

/**
 * Server-side check on the composed value.
 *
 * The dial code is all the server gets, so the expected lengths are looked up
 * from it - enough to apply the same rule the browser applied.
 */
export function validatePhoneFull(value: string): string | null {
  const v = value.trim();
  if (!v) return "Le numéro de téléphone est obligatoire.";
  if (!PHONE_FULL_REGEX.test(v)) return "Numéro de téléphone invalide.";

  const [dial, national] = v.split(" ");
  return lengthError(phoneDigits(national), nationalLengthsForDial(dial));
}

/** Only meaningful when the visitor ticked "Autre besoin". */
export function validateBesoinAutre(value: string): string | null {
  const v = value.trim();
  if (!v) return "Précisez votre besoin.";
  if (v.length < 3) return "Précisez votre besoin en quelques mots.";
  if (v.length > BESOIN_AUTRE_MAX) return "Votre précision est trop longue.";
  return null;
}
