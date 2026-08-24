/**
 * Fabrique un slug depuis un titre : sans accents, en minuscules, les suites de
 * caractères non alphanumériques repliées en un seul tiret. Utilisé côté client
 * pour proposer un slug, et côté serveur pour le nettoyer avant enregistrement.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les diacritiques (é -> e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
