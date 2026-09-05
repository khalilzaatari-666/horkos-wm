import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff";
import { peutAccederAuDossier } from "@/lib/client-access";
import { lireFiche } from "@/lib/fiche-audit/schema";
import { classeurRempli, nomFichierAudit } from "@/lib/fiche-audit/export";

/**
 * Télécharge la fiche d'audit au format du classeur du cabinet.
 *
 * Une route plutôt qu'une action : le navigateur doit recevoir un fichier avec
 * son nom et son type, ce qu'une action serveur ne sait pas rendre.
 *
 * Le modèle est lu sur le disque à chaque appel. Il pèse une quarantaine de
 * kilo-octets et l'export est un geste rare ; le mettre en cache ferait porter
 * au processus une copie permanente pour rien.
 */

const TYPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; auditId: string }> }
) {
  const { id, auditId } = await params;
  const supabase = await createClient();

  const staff = await requireStaff(supabase);
  if (!staff) return new Response("Accès réservé à l'équipe.", { status: 403 });

  const [{ data: client }, { data: audit }] = await Promise.all([
    supabase.from("profiles").select("advisor_id").eq("id", id).maybeSingle(),
    supabase
      .from("audits")
      .select("id, data, client_id")
      .eq("id", auditId)
      .eq("client_id", id)
      .maybeSingle(),
  ]);

  if (!client || !audit) return new Response("Fiche introuvable.", { status: 404 });
  if (!peutAccederAuDossier(staff, client.advisor_id)) {
    return new Response("Ce dossier est piloté par son conseiller référent.", { status: 403 });
  }

  const fiche = lireFiche(audit.data);

  let gabarit: Uint8Array;
  try {
    gabarit = new Uint8Array(await readFile(join(process.cwd(), "docs", "modele-audit.xlsx")));
  } catch {
    return new Response("Modèle de classeur introuvable sur le serveur.", { status: 500 });
  }

  const { classeur, omissions } = classeurRempli(gabarit, fiche);

  // La consultation d'un audit se journalise comme le reste des données
  // sensibles (circulaire AMMC 01/20).
  try {
    const forwarded = (await headers()).get("x-forwarded-for");
    await supabase.from("audit_logs").insert({
      user_id: staff.id,
      action: "audit.export",
      entity_type: "audit",
      entity_id: audit.id,
      ip_address: forwarded?.split(",")[0]?.trim() ?? null,
    });
  } catch {
    // La traçabilité ne doit pas empêcher le téléchargement.
  }

  // Le classeur passe par un Blob : `Uint8Array` seul n'est pas un `BodyInit`
  // pour TypeScript. On en extrait l'`ArrayBuffer` exact - `buffer` peut être
  // plus grand que la vue, et le typer `ArrayBufferLike` ne suffit pas ici.
  const octets = classeur.buffer.slice(
    classeur.byteOffset,
    classeur.byteOffset + classeur.byteLength
  ) as ArrayBuffer;

  return new Response(new Blob([octets], { type: TYPE_XLSX }), {
    headers: {
      "Content-Type": TYPE_XLSX,
      "Content-Disposition": `attachment; filename="${nomFichierAudit(fiche, new Date())}"`,
      "Content-Length": String(classeur.byteLength),
      // Chaque téléchargement doit refléter la dernière saisie.
      "Cache-Control": "no-store",
      // Ce que le modèle n'a pas pu accueillir, lisible dans l'onglet réseau si
      // quelqu'un se demande où sont passés le troisième crédit.
      ...(omissions.length ? { "X-Omissions": encodeURIComponent(omissions.join(" ; ")) } : {}),
    },
  });
}
