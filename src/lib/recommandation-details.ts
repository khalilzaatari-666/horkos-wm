import { z } from "zod";

/**
 * Forme du contenu d'une fiche produit, stocké dans `recommendations.details`.
 *
 * Ce JSON sera saisi à la main par l'admin au Sprint 6 : il sera incomplet, mal
 * formé, ou absent pendant un moment. Chaque section est donc facultative et
 * validée séparément - une clé cassée ne doit jamais faire tomber la page, elle
 * doit simplement ne pas s'afficher.
 */
const sectionSchema = z.object({
  titre: z.string().trim().min(1),
  texte: z.string().trim().min(1),
});

const detailsSchema = z.object({
  resume: z.string().trim().min(1).optional(),
  pourquoi: z.array(z.string().trim().min(1)).optional(),
  fonctionnement: z.array(sectionSchema).optional(),
  points_attention: z.array(z.string().trim().min(1)).optional(),
  frais: z.string().trim().min(1).optional(),
});

export type RecommandationDetails = z.infer<typeof detailsSchema>;

/**
 * Lit `details` sans jamais lever.
 *
 * `catchall` n'est pas utilisé : les clés inconnues sont ignorées en silence,
 * ce qui laisse la place à des champs futurs sans casser l'existant.
 */
export function parseDetails(raw: unknown): RecommandationDetails {
  if (!raw || typeof raw !== "object") return {};

  const parsed = detailsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  // Validation section par section : une liste mal formée ne doit pas emporter
  // le résumé qui, lui, est correct.
  const source = raw as Record<string, unknown>;
  const result: RecommandationDetails = {};

  const resume = z.string().trim().min(1).safeParse(source.resume);
  if (resume.success) result.resume = resume.data;

  const frais = z.string().trim().min(1).safeParse(source.frais);
  if (frais.success) result.frais = frais.data;

  const pourquoi = z.array(z.string().trim().min(1)).safeParse(source.pourquoi);
  if (pourquoi.success) result.pourquoi = pourquoi.data;

  const attention = z.array(z.string().trim().min(1)).safeParse(source.points_attention);
  if (attention.success) result.points_attention = attention.data;

  const fonctionnement = z.array(sectionSchema).safeParse(source.fonctionnement);
  if (fonctionnement.success) result.fonctionnement = fonctionnement.data;

  return result;
}

/** Une fiche sans aucune section exploitable retombe sur un affichage réduit. */
export function hasContent(details: RecommandationDetails): boolean {
  return Boolean(
    details.resume ||
      details.pourquoi?.length ||
      details.fonctionnement?.length ||
      details.points_attention?.length ||
      details.frais
  );
}
