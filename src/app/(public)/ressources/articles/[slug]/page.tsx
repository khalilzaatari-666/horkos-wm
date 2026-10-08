import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AnimateIn } from "@/components/ui/animate-in";
import { ArrowLeft } from "lucide-react";
import { ReadingProgress } from "@/components/public/reading-progress";
import { CtaBand } from "@/components/public/cta-band";
import { ArticleJsonLd } from "@/components/public/structured-data";
import { getArticle, getArticles, formatLongDate } from "@/lib/content";

export const revalidate = 300;

/** Prerender what exists at build time; anything published later renders on demand. */
export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
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

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

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
          <AnimateIn variant="fade-up" duration={1}>
            <h1 className="display-lg mt-6 text-ink">{article.title}</h1>
          </AnimateIn>
          {article.excerpt && (
            <AnimateIn variant="fade-up" delay={150}>
              <p className="lead mx-auto mt-6 max-w-[58ch]">{article.excerpt}</p>
            </AnimateIn>
          )}
        </div>
      </section>

      {article.cover_url && (
        <div className="shell">
          <AnimateIn variant="fade-up">
            <div className="relative aspect-[21/9] overflow-hidden rounded-[24px] bg-cream-deep">
              <Image src={article.cover_url} alt="" fill sizes="(min-width: 1320px) 1240px, 100vw" className="object-cover" priority />
            </div>
          </AnimateIn>
        </div>
      )}

      <article id="article" className="shell py-16 lg:py-24">
        <div className="mx-auto max-w-[680px]">
          {/* Stored as plain text from the back-office, so blank lines are paragraphs. */}
          <div className="space-y-6">
            {(article.content ?? "")
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((paragraph, i) => (
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
