/**
 * Rubriques du coffre-fort, partagées entre l'espace client (affichage) et le
 * back-office (dépôt). Une seule source pour que les deux côtés classent pareil.
 *
 * L'ordre est celui de la maquette. `autre` est un filet : accepté au dépôt,
 * mais l'espace client ne l'affiche pas comme rubrique vide.
 */
/**
 * Formats acceptés pour une pièce jointe de fiche produit : une note, un
 * diaporama de présentation, un tableau de simulation.
 *
 * Les types MIME ET les extensions sont listés : selon le système, un .pptx
 * remonte parfois sans type MIME, et le sélecteur de fichiers le refuserait
 * alors sans rien dire.
 */
export const DOCUMENT_ACCEPT = [
  "application/pdf",
  ".pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt",
  ".pptx",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls",
  ".xlsx",
].join(",");

/** « …/note-produit.pptx » → « PPTX ». Rend « FICHIER » faute d'extension. */
export function fileExtensionLabel(url: string): string {
  const clean = url.split("?")[0].split("#")[0];
  const ext = clean.split(".").pop();
  if (!ext || ext.length > 5 || ext.includes("/")) return "FICHIER";
  return ext.toUpperCase();
}

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
