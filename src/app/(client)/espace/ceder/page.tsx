import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, PanelHead, Card, Badge } from "@/components/client/ui";
import { AssetForm } from "@/components/public/asset-form";
import { splitPhone } from "@/lib/countries";
import { formatDateLong } from "@/lib/dates";
import { formatMAD } from "@/lib/patrimoine";

export const metadata: Metadata = { title: "Céder un actif" };

const STATUS: Record<string, { label: string; tone: "neutre" | "attente" | "succes" | "refus" }> = {
  soumis: { label: "Soumis", tone: "attente" },
  en_revue: { label: "En revue", tone: "attente" },
  accepte: { label: "Accepté", tone: "succes" },
  rejete: { label: "Non retenu", tone: "refus" },
};

export default async function CederPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: submissions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, email, phone")
      .eq("id", user.id)
      .maybeSingle(),
    // Du plus récent au plus ancien : c'est le dossier qu'on vient de déposer
    // qu'on vient vérifier.
    supabase
      .from("asset_submissions")
      .select("id, asset_type, description, estimated_value, reason, horizon, status, created_at")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const phone = splitPhone(profile?.phone);
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <Panel>
      <PanelHead
        eyebrow="Une opération à préparer"
        title="Céder un actif"
        desc="Bien immobilier, entreprise, participation, œuvre d'art : décrivez l'actif que vous souhaitez céder. Rien n'est présenté à un client sans votre accord préalable."
      />

      {/* Deux colonnes égales. `items-start` : chacune garde sa hauteur propre,
          un dossier isolé ne doit pas s'étirer sur toute la longueur du
          formulaire. */}
      <div className="grid lg:grid-cols-2 gap-3.5 items-start">
        <AnimateIn variant="fade-up" delay={80}>
          <section>
            <h2 className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase mb-3">
              Formulaire de soumission
            </h2>
            {/* Le même composant que sur /cabinet/produits, en mode nu pour que
                la carte vienne de l'espace. Aucune copie du formulaire. */}
            <Card className="p-6">
              <AssetForm
                bare
                defaults={{
                  contactName: fullName,
                  contactEmail: profile?.email ?? user.email ?? "",
                  phone: phone.national,
                  phoneIso: phone.iso,
                }}
              />
            </Card>
          </section>
        </AnimateIn>

        <AnimateIn variant="fade-up" delay={160}>
          <section>
            <h2 className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase mb-3">
              Mes dossiers
            </h2>

            {submissions && submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((s) => {
                  const status = STATUS[s.status] ?? { label: s.status, tone: "neutre" as const };
                  return (
                    <Card key={s.id} className="p-5">
                      <div className="flex items-start gap-2.5">
                        <span className="text-[14px] font-medium text-ink leading-[1.35] flex-1 min-w-0">
                          {s.asset_type}
                        </span>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </div>

                      {s.estimated_value ? (
                        <div className="font-heading text-[20px] font-semibold text-ink tabular-nums mt-2 leading-none">
                          {formatMAD(Number(s.estimated_value))}
                        </div>
                      ) : null}

                      {/* Motif et horizon plutôt que la description : ce sont
                          eux qui situent l'opération d'un coup d'œil. */}
                      <dl className="mt-3.5 space-y-1.5">
                        {s.reason && <DossierLigne label="Motif" value={s.reason} />}
                        {s.horizon && <DossierLigne label="Horizon" value={s.horizon} />}
                        <DossierLigne label="Déposé le" value={formatDateLong(s.created_at)} />
                      </dl>

                      {s.description && (
                        <p className="text-[12.5px] text-warm-grey leading-[1.6] mt-3 pt-3 border-t border-cream-deep line-clamp-3">
                          {s.description}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-6">
                <p className="text-[13px] text-warm-grey leading-[1.65]">
                  Vous n&apos;avez soumis aucun actif. Les dossiers déposés apparaîtront ici, du
                  plus récent au plus ancien, avec leur avancement.
                </p>
              </Card>
            )}
          </section>
        </AnimateIn>
      </div>
    </Panel>
  );
}

/** Une ligne clé / valeur du suivi de dossier. */
function DossierLigne({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-[12.5px]">
      <dt className="text-warm-grey shrink-0">{label}</dt>
      <dd className="text-charcoal text-right flex-1 min-w-0 truncate">{value}</dd>
    </div>
  );
}
