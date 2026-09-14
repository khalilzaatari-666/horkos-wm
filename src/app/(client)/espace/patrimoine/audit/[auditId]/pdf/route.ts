import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { lireFiche } from "@/lib/fiche-audit/schema";
import { pdfAudit } from "@/lib/fiche-audit/pdf";
import { nomFichierAudit } from "@/lib/fiche-audit/nom-fichier";

/**
 * La fiche d'audit en PDF, téléchargée par le client depuis son espace.
 *
 * Même document que celui du back-office, une règle en plus : seule une fiche
 * **close** se télécharge. Tant que le conseiller y travaille, la page dit au
 * client que l'audit est en cours ; lui remettre un document à moitié rempli
 * contredirait cette promesse.
 *
 * La RLS garantit que la requête ne rend que les audits du client connecté ;
 * le filtre `client_id` ci-dessous est une ceinture en plus des bretelles.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const { auditId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Connexion requise.", { status: 401 });

  const { data: audit } = await supabase
    .from("audits")
    .select("id, data, status")
    .eq("id", auditId)
    .eq("client_id", user.id)
    .maybeSingle();

  if (!audit) return new Response("Audit introuvable.", { status: 404 });
  if (audit.status !== "termine") {
    return new Response("Votre audit est encore en cours de rédaction.", { status: 409 });
  }

  const fiche = lireFiche(audit.data);
  const date = new Date();

  let pdf: Uint8Array;
  try {
    pdf = await pdfAudit(fiche, date);
  } catch (error) {
    console.error("[audit] génération du PDF impossible:", error);
    return new Response("Le PDF n'a pas pu être généré.", { status: 500 });
  }

  // Consultation d'une donnée patrimoniale : journalisée comme les autres
  // (circulaire AMMC 01/20), sans jamais bloquer le téléchargement.
  try {
    const forwarded = (await headers()).get("x-forwarded-for");
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "audit.export.client",
      entity_type: "audit",
      entity_id: audit.id,
      ip_address: forwarded?.split(",")[0]?.trim() ?? null,
    });
  } catch {
    // Silencieux par conception.
  }

  const tampon = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new Response(new Blob([tampon], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichierAudit(fiche, date, "pdf")}"`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
