import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/public/page-hero";
import { EmptyState } from "@/components/public/empty-state";
import { CtaBand } from "@/components/public/cta-band";
import { AnimateIn } from "@/components/ui/animate-in";
import { getArticles, getCategories, filtrerParCategorie, formatLongDate, couvertureArticle, type Article } from "@/lib/content";
import { FiltreCategories } from "@/components/public/filtre-categories";

export const metadata: Metadata = {
  title: "Nos articles | Horkos Wealth Management",
  description:
    "Nos points de vue sur l’actualité patrimoniale, fiscale et réglementaire au Maroc.",
};

export const revalidate = 300;

function Cover({ article, sizes }: { article: Article; sizes: string }) {
  return (
    <Image
      src={couvertureArticle(article)}
      alt=""
      fill
      sizes={sizes}
      className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
    />
  );
}

function Meta({ article }: { article: Article }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-[14px] text-warm-grey">
      {article.category && <span className="text-ink">{article.category}</span>}
      {article.category && <span aria-hidden="true">·</span>}
      <span>{formatLongDate(article.published_at ?? article.created_at)}</span>
    </p>
  );
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string | string[] }>;
}) {
  const [articles, ordre, { categorie }] = await Promise.all([
    getArticles(),
    getCategories("articles"),
    searchParams,
  ]);
  const { categories, active, visibles } = filtrerParCategorie(articles, ordre, categorie);
  const [une, ...suite] = visibles;

  return (
    <>
      <PageHero
        tag="Articles"
        title="Décrypter la gestion de patrimoine, sans jargon."
        subtitle="Nos points de vue sur l’actualité patrimoniale, fiscale et réglementaire au Maroc."
        image="/images/pages/article-lecture.jpg"
      />

      <section className="shell pb-12 lg:pb-16">
        {articles.length === 0 ? (
          <EmptyState
            title="Nos premiers articles arrivent"
            desc="Nous préparons nos analyses sur la structuration, la fiscalité et la transmission au Maroc."
          />
        ) : (
          <>
            <FiltreCategories base="/ressources/articles" categories={categories} active={active} />

            {une && (
              <AnimateIn variant="fade-up">
                <Link
                  href={`/ressources/articles/${une.slug}`}
                  className="group grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14 lg:items-end"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-cream-deep">
                    <Cover article={une} sizes="(min-width: 1024px) 60vw, 100vw" />
                  </div>
                  <div className="lg:pb-4">
                    <Meta article={une} />
                    <h2 className="display-md mt-4 text-ink group-hover:underline decoration-1 underline-offset-[6px]">
                      {une.title}
                    </h2>
                    {une.excerpt && <p className="lead mt-5 max-w-[46ch]">{une.excerpt}</p>}
                    <span className="link-arrow mt-7">
                      Lire l’article <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </AnimateIn>
            )}

            {suite.length > 0 && (
              <ul className="mt-16 lg:mt-24 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {suite.map((article, i) => (
                  <li key={article.id}>
                    <AnimateIn variant="fade-up" delay={(i % 3) * 80}>
                      <Link href={`/ressources/articles/${article.slug}`} className="group block">
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-cream-deep">
                          <Cover article={article} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" />
                        </div>
                        <div className="mt-5">
                          <Meta article={article} />
                        </div>
                        <h2 className="mt-2 font-heading text-[24px] leading-[1.15] text-ink group-hover:underline decoration-1 underline-offset-4">
                          {article.title}
                        </h2>
                        {article.excerpt && (
                          <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-warm-grey">{article.excerpt}</p>
                        )}
                      </Link>
                    </AnimateIn>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <CtaBand title="Une question après lecture ?" label="Prendre rendez-vous" />
    </>
  );
}
