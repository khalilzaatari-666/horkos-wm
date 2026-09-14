import type { FicheAudit } from "./schema";

/**
 * Nom de fichier proposé au téléchargement : « audit-amine-benali-2026-09-11.xlsx ».
 *
 * Partagé par le classeur et le PDF : deux exports du même dossier le même
 * jour doivent se ranger côte à côte, et ne différer que par l'extension.
 */
export function nomFichierAudit(fiche: FicheAudit, date: Date, extension: "xlsx" | "pdf"): string {
  const nom = [fiche.titulaire.prenom, fiche.titulaire.nom]
    .filter(Boolean)
    .join("-")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9-]/g, "")
    .toLowerCase();
  const jour = date.toISOString().slice(0, 10);
  return `audit-${nom || "client"}-${jour}.${extension}`;
}
