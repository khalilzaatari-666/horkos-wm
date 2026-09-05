import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminBadge } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/dates";
import { peutAccederAuDossier } from "@/lib/client-access";
import { omissionsClasseur } from "@/lib/fiche-audit/export";
import { lireFiche } from "@/lib/fiche-audit/schema";
import { libelleType } from "@/lib/parcours";
import { FicheForm } from "./fiche-form";
import { FicheVue } from "./fiche-vue";

export const metadata: Metadata = { title: "Fiche d'audit" };

/**
 * La fiche d'audit d'un client.
 *
 * Elle a sa propre page plutôt qu'une place dans un onglet : le formulaire est
 * long, et on y revient entre deux rendez-vous. On y entre depuis le suivi (au
 * R0) comme depuis l'onglet Audits.
 */
export default async function FicheAuditPage({
  params,
}: {
  params: Promise<{ id: string; auditId: string }>;
}) {
  const { id, auditId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: client }, { data: me }, { data: audit }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, email, phone, advisor_id")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("audits")
      .select("id, status, data, updated_at, appointment_id")
      .eq("id", auditId)
      .eq("client_id", id)
      .maybeSingle(),
  ]);

  if (!client || !audit) notFound();

  const pilote = peutAccederAuDossier(
    { id: user.id, role: me?.role ?? "" },
    client.advisor_id ?? null
  );

  // Le rendez-vous d'origine, s'il y en a un : c'est ce qui rattache la fiche à
  // une étape du parcours.
  const { data: rdv } = audit.appointment_id
    ? await supabase
        .from("appointments")
        .select("type, date")
        .eq("id", audit.appointment_id)
        .maybeSingle()
    : { data: null };

  const nom = [client.first_name, client.last_name].filter(Boolean).join(" ") || "Client";
  const fiche = lireFiche(audit.data);
  const omissions = omissionsClasseur(fiche);
  const lectureSeule = !pilote || audit.status === "termine";

  return (
    <>
      <AnimateIn variant="fade-up">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-[22px] font-semibold text-ink leading-[1.2]">
                Fiche d&apos;audit - {nom}
              </h1>
              <AdminBadge tone={audit.status === "termine" ? "succes" : "attente"}>
                {audit.status === "termine" ? "Close" : "En cours"}
              </AdminBadge>
            </div>
            <p className="text-[13px] text-warm-grey leading-[1.6] mt-1.5 max-w-[620px]">
              {rdv
                ? `Ouverte pour le ${libelleType(rdv.type)} du ${formatDateTime(rdv.date)}.`
                : "Fiche rattachée à aucun rendez-vous."}{" "}
              Dernière modification le {formatDateTime(audit.updated_at)}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/clients/${id}/audits/${auditId}/export`}
              prefetch={false}
              className="h-10 px-4 inline-flex items-center text-[13px] font-medium text-ink border border-cream-deep rounded-lg hover:border-bronze transition-colors"
            >
              Télécharger le classeur
            </Link>
            <Link
              href={`/admin/clients/${id}/patrimoine`}
              className="h-10 px-4 inline-flex items-center text-[13px] text-warm-grey hover:text-ink transition-colors"
            >
              Retour
            </Link>
          </div>
        </div>
      </AnimateIn>

      {/* Avertissement visible avant le clic, pas seulement dans un en-tête
          HTTP qu'un téléchargement de fichier ne montre jamais à personne. */}
      {omissions.length > 0 && (
        <AnimateIn variant="fade-up">
          <div className="mb-5 p-4 rounded-xl border border-bronze/40 bg-bronze/[0.07]">
            <p className="text-[13px] text-ink leading-[1.6]">
              <span className="font-semibold">Le classeur téléchargé sera incomplet</span> - son
              modèle ne prévoit pas de place pour : {omissions.join(", ")}. Ces éléments restent
              comptés sur la plateforme (patrimoine, tableau de bord) ; seul le fichier Excel n&apos;en
              garde pas trace.
            </p>
          </div>
        </AnimateIn>
      )}

      {lectureSeule ? (
        <FicheVue fiche={fiche} raison={audit.status === "termine" ? "clos" : "non-pilote"} />
      ) : (
        <FicheForm
          clientId={id}
          auditId={auditId}
          initiale={fiche}
          compte={{
            nom: client.last_name ?? "",
            prenom: client.first_name ?? "",
            email: client.email ?? "",
            telephone: client.phone ?? "",
          }}
        />
      )}
    </>
  );
}
