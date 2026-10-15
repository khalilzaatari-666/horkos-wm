import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimateIn } from "@/components/ui/animate-in";
import { LineReveal } from "@/components/ui/line-reveal";
import { ArrowLeft } from "lucide-react";
import { RevealImage } from "@/components/public/reveal-image";
import { ReadingProgress } from "@/components/public/reading-progress";
import { CtaBand } from "@/components/public/cta-band";
import { ArticleJsonLd } from "@/components/public/structured-data";
import { ContentGate, LignesFloues, MerciLecteur } from "@/components/public/content-gate";
import { getArticle, formatLongDate, couvertureArticle } from "@/lib/content";
import { estDeverrouille, lireContenuArticle, paragraphes } from "@/lib/lecteur";
import { smsActif } from "@/lib/sms";


interface PageProps {
  params: Promise<{ slug: string }>;
  /** `merci` : posé par le formulaire du lecteur juste après la vérification. */
  searchParams: Promise<{ merci?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Article introuvable | Horkos Wealth Management" };

  return {
    title: `${article.title} | Horkos Wealth Management`,
    description: article.excerpt ?? undefined,
  };
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { merci } = await searchParams;
  const article = await getArticle(slug);
  if (!article) notFound();

  // Le texte complet ne quitte le serveur que pour un lecteur identifié ;
  // sinon seul le premier paragraphe est rendu.
  const ouvert = await estDeverrouille();
  const texte = paragraphes(await lireContenuArticle(article.id));
  const visibles = ouvert ? texte : texte.slice(0, 1);

  return (
    <>
      <ArticleJsonLd
        title={article.title}
        description={article.excerpt}
        slug={article.slug}
        publishedAt={article.published_at ?? article.created_at}
        imageUrl={article.cover_url}
      />
      <ReadingProgress target="article" />
      <section className="shell pt-8 pb-12 lg:pt-12 lg:pb-16">
        <nav aria-label="Fil d’Ariane" className="text-[14px] text-warm-grey">
          <Link href="/" className="hover:text-ink transition-colors">Accueil</Link>
          <span aria-hidden="true" className="mx-2">/</span>
          <Link href="/ressources/articles" className="hover:text-ink transition-colors">Articles</Link>
        </nav>
        <div className="mx-auto mt-12 max-w-[860px] text-center lg:mt-20">
          <p className="flex flex-wrap items-center justify-center gap-2 text-[14px] text-warm-grey">
            {article.category && <span className="text-ink">{article.category} ·</span>}
            <span>{formatLongDate(article.published_at ?? article.created_at)}</span>
          </p>
          <LineReveal className="display-lg mt-6 text-ink">{article.title}</LineReveal>
          {article.excerpt && (
            <AnimateIn variant="fade-up" delay={150}>
              <p className="lead mx-auto mt-6 max-w-[58ch]">{article.excerpt}</p>
            </AnimateIn>
          )}
        </div>
      </section>

      <div className="shell">
        <RevealImage
          src={couvertureArticle(article)}
          alt=""
          priority
          sizes="(min-width: 1320px) 1240px, 100vw"
          className="aspect-[21/9]"
        />
      </div>

      <article id="article" className="shell py-16 lg:py-24">
        <div className="mx-auto max-w-[680px]">
          {ouvert && merci && (
            <MerciLecteur sourceType="article" titre={article.title} emailSent={merci === "1"} />
          )}
          {/* Stored as plain text from the back-office, so blank lines are paragraphs. */}
          <div className="space-y-6">
            {visibles.map((paragraph, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "text-[20px] leading-[1.7] text-ink"
                    : "text-[18px] leading-[1.8] text-charcoal"
                }
              >
                {paragraph}
              </p>
            ))}
          </div>

          {!ouvert && texte.length > 1 && (
            <div className="mt-6">
              <ContentGate sourceType="article" sourceId={article.id} sms={smsActif()}>
                <LignesFloues />
              </ContentGate>
            </div>
          )}

          <div className="mt-14 flex items-center justify-between gap-4 border-t border-ink/10 pt-8">
            <Link href="/ressources/articles" className="link-arrow">
              <ArrowLeft className="size-4" aria-hidden="true" /> Tous nos articles
            </Link>
            <Link href="/rendez-vous" className="btn btn-outline btn-sm">
              En parler avec nous
            </Link>
          </div>
        </div>
      </article>

      <CtaBand title="Une question après lecture ?" label="Prendre rendez-vous" />
    </>
  );
}
