import { pdfAudit } from "@/lib/fiche-audit/pdf";
import { nomFichierAudit } from "@/lib/fiche-audit/nom-fichier";
import { fichier, lireFichePourExport } from "../lecture";

/**
 * Télécharge la fiche d'audit en PDF - le document qu'on remet ou qu'on
 * archive, là où le classeur est celui qu'on retravaille.
 *
 * Les polices sont embarquées : la génération lit les fichiers du disque et
 * prend quelques centaines de millisecondes. L'export est un geste rare, on ne
 * met rien en cache.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; auditId: string }> }
) {
  const { id, auditId } = await params;
  const lecture = await lireFichePourExport(id, auditId);
  if (!lecture.ok) return lecture.reponse;

  const date = new Date();
  let pdf: Uint8Array;
  try {
    pdf = await pdfAudit(lecture.fiche, date);
  } catch (error) {
    console.error("[audit] génération du PDF impossible:", error);
    return new Response("Le PDF n'a pas pu être généré.", { status: 500 });
  }
  await lecture.journaliser();

  return fichier(pdf, "application/pdf", nomFichierAudit(lecture.fiche, date, "pdf"));
}
