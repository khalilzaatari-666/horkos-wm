import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AnimateIn } from "@/components/ui/animate-in";
import { SplitHeading } from "@/components/ui/split-heading";
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
      <section className="bg-ink text-cream pt-[50px] pb-[36px] overflow-hidden">
        <div className="max-w-[760px] mx-auto px-7">
          <AnimateIn variant="blur-in" duration={0.5}>
            <div className="flex items-center gap-3 mb-4 text-[11px] font-semibold tracking-[1.5px] uppercase">
              {article.category && <span className="text-bronze-light">{article.category}</span>}
              <span className="text-[#8E8474] normal-case tracking-normal font-normal text-[12.5px]">
                {formatLongDate(article.published_at ?? article.created_at)}
              </span>
            </div>
          </AnimateIn>
          <SplitHeading
            text={article.title}
            className="text-[clamp(1.6rem,4vw,1.875rem)] font-medium text-cream leading-[1.3]"
            delay={200}
          />
          {article.excerpt && (
            <AnimateIn variant="fade-up" delay={400}>
              <p className="text-[#D8CDBC] mt-3.5 text-[14.5px] leading-[1.7]">{article.excerpt}</p>
            </AnimateIn>
          )}
        </div>
      </section>

      <article className="py-14">
        <div className="max-w-[760px] mx-auto px-7">
          {article.cover_url && (
            <AnimateIn variant="scale-in">
              <Image
                src={article.cover_url}
                alt=""
                width={1200}
                height={630}
                className="w-full rounded-lg mb-9 object-cover"
              />
            </AnimateIn>
          )}

          <AnimateIn variant="fade-up" delay={120}>
            {/* Stored as plain text from the back-office, so blank lines are paragraphs. */}
            <div className="space-y-5">
              {(article.content ?? "")
                .split(/\n{2,}/)
                .map((p) => p.trim())
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i} className="text-[15px] text-charcoal leading-[1.8]">
                    {paragraph}
                  </p>
                ))}
            </div>
          </AnimateIn>

          <div className="mt-10 pt-6 border-t border-cream-deep">
            <Link
              href="/ressources/articles"
              className="text-bronze text-[13px] font-medium hover:text-bronze-dark transition-colors"
            >
              ← Tous nos articles
            </Link>
          </div>
        </div>
      </article>

      <CtaBand title="Une question après lecture ?" label="Prendre rendez-vous" />
    </>
  );
}
