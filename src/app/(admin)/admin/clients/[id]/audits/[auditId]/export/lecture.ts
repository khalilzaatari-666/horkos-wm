import "server-only";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff";
import { peutAccederAuDossier } from "@/lib/client-access";
import { lireFiche, type FicheAudit } from "@/lib/fiche-audit/schema";

/**
 * Ce que les deux exports (classeur, PDF) ont en commun : le contrôle d'accès,
 * la lecture de la fiche et la trace dans le journal. Une seule fonction, pour
 * qu'un durcissement de la règle d'accès ne puisse pas oublier l'un des deux.
 */
export type Lecture =
  | { ok: true; fiche: FicheAudit; journaliser: () => Promise<void> }
  | { ok: false; reponse: Response };

export async function lireFichePourExport(id: string, auditId: string): Promise<Lecture> {
  const supabase = await createClient();

  const staff = await requireStaff(supabase);
  if (!staff) {
    return { ok: false, reponse: new Response("Accès réservé à l'équipe.", { status: 403 }) };
  }

  const [{ data: client }, { data: audit }] = await Promise.all([
    supabase.from("profiles").select("advisor_id").eq("id", id).maybeSingle(),
    supabase
      .from("audits")
      .select("id, data, client_id")
      .eq("id", auditId)
      .eq("client_id", id)
      .maybeSingle(),
  ]);

  if (!client || !audit) {
    return { ok: false, reponse: new Response("Fiche introuvable.", { status: 404 }) };
  }
  if (!peutAccederAuDossier(staff, client.advisor_id)) {
    return {
      ok: false,
      reponse: new Response("Ce dossier est piloté par son conseiller référent.", { status: 403 }),
    };
  }

  return {
    ok: true,
    fiche: lireFiche(audit.data),
    // La consultation d'un audit se journalise comme le reste des données
    // sensibles (circulaire AMMC 01/20). Jamais bloquant : la traçabilité ne
    // doit pas empêcher le téléchargement.
    journaliser: async () => {
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
        // Silencieux par conception.
      }
    },
  };
}

/**
 * `Uint8Array` seul n'est pas un `BodyInit` pour TypeScript. On en extrait
 * l'`ArrayBuffer` exact - `buffer` peut être plus grand que la vue.
 */
export function fichier(octets: Uint8Array, type: string, nom: string): Response {
  const tampon = octets.buffer.slice(
    octets.byteOffset,
    octets.byteOffset + octets.byteLength
  ) as ArrayBuffer;

  return new Response(new Blob([tampon], { type }), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Content-Length": String(octets.byteLength),
      // Chaque téléchargement doit refléter la dernière saisie.
      "Cache-Control": "no-store",
    },
  });
}
