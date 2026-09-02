import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, Card, CardTitle, Badge } from "@/components/client/ui";
import { formatDateLong } from "@/lib/dates";
import { parseDetails, hasContent } from "@/lib/recommandation-details";
import { fileExtensionLabel } from "@/lib/documents";
import { DemanderEchange } from "./demander-echange";

const STATUS: Record<string, { label: string; tone: "neutre" | "attente" | "succes" | "refus" }> = {
  proposee: { label: "À étudier", tone: "attente" },
  acceptee: { label: "Acceptée", tone: "succes" },
  mise_en_place: { label: "Mise en place", tone: "succes" },
  rejetee: { label: "Écartée", tone: "neutre" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  return { title: data?.title ?? "Recommandation" };
}

export default async function RecommandationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // La recommandation n'est lisible que si elle a été proposée à CE client.
  // `recommendations` est visible de tous dès qu'elle est active : sans cette
  // jointure, un client pourrait lire une fiche qui ne lui a jamais été
  // adressée en devinant son identifiant.
  const { data: attribution } = await supabase
    .from("client_recommendations")
    .select("id, status, notes, created_at, recommendations(id, title, category, description, details)")
    .eq("client_id", user.id)
    .eq("recommendation_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const reco = Array.isArray(attribution?.recommendations)
    ? attribution?.recommendations[0]
    : attribution?.recommendations;

  if (!attribution || !reco) notFound();

  const details = parseDetails(reco.details);
  const status = STATUS[attribution.status] ?? { label: attribution.status, tone: "neutre" as const };

  return (
    <Panel>
      <AnimateIn variant="fade-up">
        <nav className="text-[12px] text-warm-grey mb-5" aria-label="Fil d'Ariane">
          <Link href="/espace/recommandations" className="hover:text-bronze transition-colors">
            Mes recommandations
          </Link>
          <span className="mx-1.5" aria-hidden="true">
            /
          </span>
          <span className="text-charcoal">{reco.title}</span>
        </nav>

        <div className="flex items-start gap-3 mb-2">
          <span className="text-[11.5px] font-semibold tracking-[1.5px] uppercase text-bronze-dark">
            {reco.category}
          </span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <h1 className="font-heading text-[clamp(1.5rem,3.2vw,1.8rem)] font-semibold text-ink leading-[1.25]">
          {reco.title}
        </h1>
        <p className="text-[12px] text-warm-grey mt-2">
          Proposée le {formatDateLong(attribution.created_at)}
        </p>
      </AnimateIn>

      <div className="space-y-3.5 mt-7">
        {(details.resume || reco.description) && (
          <AnimateIn variant="fade-up" delay={80}>
            <Card className="p-6">
              <p className="text-[14px] text-charcoal leading-[1.75]">
                {details.resume ?? reco.description}
              </p>
            </Card>
          </AnimateIn>
        )}

        {details.pourquoi?.length ? (
          <AnimateIn variant="fade-up" delay={140}>
            <Card className="p-6">
              <CardTitle>Pourquoi cette recommandation</CardTitle>
              <ul className="space-y-2.5">
                {details.pourquoi.map((point, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] text-charcoal leading-[1.65]">
                    <span aria-hidden="true" className="text-bronze shrink-0">
                      -
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </Card>
          </AnimateIn>
        ) : null}

        {details.fonctionnement?.length ? (
          <AnimateIn variant="fade-up" delay={200}>
            <Card className="p-6">
              <CardTitle>Comment ça fonctionne</CardTitle>
              <div className="space-y-5">
                {details.fonctionnement.map((section, i) => (
                  <div key={i}>
                    <h3 className="text-[13.5px] font-semibold text-ink">{section.titre}</h3>
                    <p className="text-[13px] text-warm-grey leading-[1.65] mt-1">
                      {section.texte}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </AnimateIn>
        ) : null}

        {details.points_attention?.length ? (
          <AnimateIn variant="fade-up" delay={260}>
            <Card className="p-6 border-bronze/30 bg-cream/40">
              <CardTitle>Points d&apos;attention</CardTitle>
              <ul className="space-y-2.5">
                {details.points_attention.map((point, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] text-charcoal leading-[1.65]">
                    <span aria-hidden="true" className="text-bronze shrink-0">
                      !
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </Card>
          </AnimateIn>
        ) : null}

        {details.photos?.length ? (
          <AnimateIn variant="fade-up" delay={300}>
            <Card className="p-6">
              <CardTitle>En images</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {details.photos.map((photo) => (
                  <figure key={photo.url}>
                    {/* `unoptimized` : ces images viennent du bucket public, dont
                        le domaine n'est pas déclaré à l'optimiseur de Next. */}
                    <Image
                      src={photo.url}
                      alt={photo.legende ?? ""}
                      width={640}
                      height={420}
                      unoptimized
                      className="w-full h-auto rounded-lg border border-cream-deep"
                    />
                    {photo.legende && (
                      <figcaption className="text-[12px] text-warm-grey leading-[1.5] mt-1.5">
                        {photo.legende}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </Card>
          </AnimateIn>
        ) : null}

        {details.documents?.length ? (
          <AnimateIn variant="fade-up" delay={340}>
            <Card className="p-6">
              <CardTitle>Documents</CardTitle>
              <ul className="space-y-2">
                {details.documents.map((doc) => (
                  <li key={doc.url}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[13.5px] text-bronze-dark hover:text-bronze transition-colors"
                    >
                      <span className="text-[10.5px] font-semibold text-warm-grey border border-cream-deep rounded px-1.5 py-0.5">
                        {fileExtensionLabel(doc.url)}
                      </span>
                      {doc.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </AnimateIn>
        ) : null}

        {details.frais && (
          <AnimateIn variant="fade-up" delay={320}>
            <Card className="p-6">
              <CardTitle>Frais</CardTitle>
              <p className="text-[13.5px] text-charcoal leading-[1.7]">{details.frais}</p>
            </Card>
          </AnimateIn>
        )}

        {attribution.notes && (
          <AnimateIn variant="fade-up" delay={380}>
            <Card className="p-6 bg-ink text-cream border-ink">
              <h2 className="font-heading text-[16px] font-semibold text-cream leading-[1.3] mb-3">
                Le mot de votre conseiller
              </h2>
              <p className="text-[13.5px] leading-[1.7] text-[#D8CDBC]">{attribution.notes}</p>
            </Card>
          </AnimateIn>
        )}

        {!hasContent(details) && !reco.description && (
          <AnimateIn variant="fade-up" delay={80}>
            <Card className="p-6">
              <p className="text-[13.5px] text-warm-grey leading-[1.7]">
                Le détail de cette recommandation n&apos;a pas encore été rédigé. Votre conseiller
                vous la présentera lors de votre prochain échange.
              </p>
            </Card>
          </AnimateIn>
        )}
      </div>

      <AnimateIn variant="fade-up" delay={440}>
        <div className="mt-8 p-6 rounded-xl border border-cream-deep bg-cream/50 text-center">
          <p className="text-[13.5px] text-charcoal leading-[1.65]">
            Une question sur cette recommandation ? Votre conseiller y répond avant toute décision.
          </p>
          <DemanderEchange recommendationId={reco.id} />
        </div>
      </AnimateIn>
    </Panel>
  );
}
