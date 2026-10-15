import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { AnimateIn } from "@/components/ui/animate-in";
import { LineReveal } from "@/components/ui/line-reveal";
import { ContentGate, GateCard, LignesFloues, MerciLecteur } from "@/components/public/content-gate";
import { PdfReader } from "@/components/public/pdf-reader";
import { CtaBand } from "@/components/public/cta-band";
import { getGuide, type Guide } from "@/lib/content";
import { estDeverrouille, lirePdfGuide } from "@/lib/lecteur";
import { smsActif } from "@/lib/sms";

interface PageProps {
  params: Promise<{ slug: string }>;
  /** `merci` : posé par le formulaire du lecteur juste après la vérification. */
  searchParams: Promise<{ merci?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) return { title: "Guide introuvable | Horkos Wealth Management" };
  return {
    title: `${guide.title} | Horkos Wealth Management`,
    description: guide.description ?? undefined,
  };
}

/**
 * Un guide. Fermé : la première page de texte du PDF, nette en haut, puis
 * floutée dans ses pixels avec les autres pages, sous le formulaire du lecteur. Ouvert : le PDF
 * entier se lit ici et se télécharge. Le lien du PDF ne quitte le serveur
 * qu'à ce moment.
 */
export default async function GuidePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { merci } = await searchParams;
  const guide = await getGuide(slug);
  if (!guide) notFound();

  const ouvert = await estDeverrouille();
  const pdf = ouvert ? await lirePdfGuide(guide.id) : null;

  return (
    <>
      <section className="shell pt-8 pb-10 lg:pt-12 lg:pb-14">
        <FilAriane />
        <div className="mx-auto mt-12 max-w-[860px] text-center lg:mt-20">
          <Meta guide={guide} />
          <LineReveal className="display-lg mt-6 text-ink">{guide.title}</LineReveal>
          {guide.description && (
            <AnimateIn variant="fade-up" delay={150}>
              <p className="lead mx-auto mt-6 max-w-[58ch]">{guide.description}</p>
            </AnimateIn>
          )}
        </div>
      </section>

      <section id="guide" className="shell pb-16 lg:pb-24">
        <div className="mx-auto max-w-[760px]">
          {!ouvert ? (
            <Extrait guide={guide} sms={smsActif()} />
          ) : (
            <>
              {merci && <MerciLecteur sourceType="guide" titre={guide.title} emailSent={merci === "1"} />}
              {pdf ? (
                <>
                  <div className="mb-6 flex justify-end">
                    <a href={pdf} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <Download className="size-4" aria-hidden="true" /> Télécharger le PDF
                    </a>
                  </div>
                  <PdfReader url={pdf} titre={guide.title} />
                </>
              ) : (
                <p className="rounded-[20px] bg-cream-deep px-6 py-5 text-[15px] text-charcoal">
                  Le PDF de ce guide arrive très bientôt.
                </p>
              )}
            </>
          )}
          <Pied />
        </div>
      </section>

      <CtaBand title="Une question après lecture ?" label="Prendre rendez-vous" />
    </>
  );
}

function FilAriane() {
  return (
    <nav aria-label="Fil d’Ariane" className="text-[14px] text-warm-grey">
      <Link href="/" className="hover:text-ink transition-colors">Accueil</Link>
      <span aria-hidden="true" className="mx-2">/</span>
      <Link href="/ressources/guides" className="hover:text-ink transition-colors">Guides</Link>
    </nav>
  );
}

function Meta({ guide }: { guide: Guide }) {
  return (
    <p className="text-[14px] text-warm-grey">
      <span className="text-ink">Guide{guide.category ? ` · ${guide.category}` : ""}</span>
      {guide.partner && ` · Avec ${guide.partner}`}
    </p>
  );
}

function Pied() {
  return (
    <div className="mt-14 flex items-center justify-between gap-4 border-t border-ink/10 pt-8">
      <Link href="/ressources/guides" className="link-arrow">
        <ArrowLeft className="size-4" aria-hidden="true" /> Tous nos guides
      </Link>
      <Link href="/rendez-vous" className="btn btn-outline btn-sm">
        En parler avec nous
      </Link>
    </div>
  );
}

/** Une feuille du guide sur le panneau crème. */
const FEUILLE = "overflow-hidden rounded-[4px] bg-white shadow-[0_18px_40px_-30px_rgba(11,26,46,0.35)]";

/**
 * Le guide fermé, comme un document qu'on feuillette : la moitié haute de la
 * première page nette, puis floutée avec les pages suivantes, et le
 * formulaire du lecteur au milieu de ce brouillard,
 * qui le suit au défilement. Sans aperçu (PDF pas encore traité), le même
 * formulaire sur des lignes floutées.
 */
function Extrait({ guide, sms }: { guide: Guide; sms: boolean }) {
  if (!guide.preview_url || !guide.preview_blur_url) {
    return (
      <ContentGate sourceType="guide" sourceId={guide.id} sms={sms}>
        <LignesFloues />
      </ContentGate>
    );
  }

  return (
    <div className="rounded-[28px] bg-cream-deep px-4 py-8 sm:px-12 sm:py-12">
      <div className="mx-auto max-w-[620px]">
        {/* Sans fond : le bas estompé laisse voir la page floutée dessous. */}
        <div className="relative z-[1] overflow-hidden rounded-t-[4px]">
          <Image
            src={guide.preview_url}
            alt={`Extrait du guide ${guide.title}`}
            width={1200}
            height={849}
            sizes="(min-width: 700px) 620px, 100vw"
            className="block h-auto w-full [mask-image:linear-gradient(to_bottom,black_80%,transparent)]"
            priority
          />
        </div>

        {/* Le brouillard : la suite de la page d'extrait, puis les autres pages. */}
        <div className="relative min-h-[600px]">
          <div aria-hidden="true" className="space-y-6">
            {/* La suite de la page A4, floutée dans ses pixels. Elle remonte sous
                les 20 % du bas de la moitié nette (14 % de la largeur), d’où le
                cadrage sur les 60 % du bas de la page (1200/1018). */}
            <div className={`-mt-[14.15%] rounded-t-none ${FEUILLE}`}>
              <Image
                src={guide.preview_blur_url}
                alt=""
                width={600}
                height={849}
                sizes="(min-width: 700px) 620px, 100vw"
                className="block aspect-[1200/1018] w-full object-cover object-bottom"
              />
            </div>
            {(guide.preview_pages ?? []).map((url) => (
              <div key={url} className={FEUILLE}>
                <Image src={url} alt="" width={600} height={849} sizes="(min-width: 700px) 620px, 100vw" className="block h-auto w-full" />
              </div>
            ))}
          </div>

          <div className="absolute inset-0 z-10 flex justify-center px-1 sm:px-6">
            <GateCard
              sourceType="guide"
              sourceId={guide.id}
              sms={sms}
              className="sticky top-[max(6.5rem,calc(50vh-18rem))] mt-8 h-fit max-w-[440px] shadow-[0_24px_60px_-28px_rgba(11,26,46,0.35)] sm:mt-12"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
