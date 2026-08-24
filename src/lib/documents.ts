/**
 * Rubriques du coffre-fort, partagées entre l'espace client (affichage) et le
 * back-office (dépôt). Une seule source pour que les deux côtés classent pareil.
 *
 * L'ordre est celui de la maquette. `autre` est un filet : accepté au dépôt,
 * mais l'espace client ne l'affiche pas comme rubrique vide.
 */
export const DOCUMENT_RUBRIQUES = [
  { key: "releves_situation", label: "Relevés de situation" },
  { key: "contrats", label: "Contrats & souscriptions" },
  { key: "reglementaires", label: "Documents réglementaires signés" },
  { key: "strategie", label: "Stratégie & comptes rendus" },
  { key: "autre", label: "Autres pièces" },
] as const;

export type DocumentCategory = (typeof DOCUMENT_RUBRIQUES)[number]["key"];

export const DOCUMENT_CATEGORIES = DOCUMENT_RUBRIQUES.map((r) => r.key) as [
  DocumentCategory,
  ...DocumentCategory[],
];

export function documentCategoryLabel(key: string): string {
  return DOCUMENT_RUBRIQUES.find((r) => r.key === key)?.label ?? key;
}
