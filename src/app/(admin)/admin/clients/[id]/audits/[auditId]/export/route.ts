import { classeurAudit } from "@/lib/fiche-audit/classeur";
import { nomFichierAudit } from "@/lib/fiche-audit/nom-fichier";
import { fichier, lireFichePourExport } from "./lecture";

/**
 * Télécharge la fiche d'audit en classeur Excel.
 *
 * Une route plutôt qu'une action : le navigateur doit recevoir un fichier avec
 * son nom et son type, ce qu'une action serveur ne sait pas rendre.
 *
 * Le classeur est construit à partir de la fiche, sans gabarit : il contient
 * tout - le remplissage du modèle du cabinet s'arrêtait au premier bien
 * locatif et au deuxième crédit.
 */

const TYPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; auditId: string }> }
) {
  const { id, auditId } = await params;
  const lecture = await lireFichePourExport(id, auditId);
  if (!lecture.ok) return lecture.reponse;

  const date = new Date();
  const classeur = classeurAudit(lecture.fiche, date);
  await lecture.journaliser();

  return fichier(classeur, TYPE_XLSX, nomFichierAudit(lecture.fiche, date, "xlsx"));
}
