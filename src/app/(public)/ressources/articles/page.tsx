import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/page-hero";
import { EmptyState } from "@/components/public/empty-state";
import { CtaBand } from "@/components/public/cta-band";
import { AnimateIn } from "@/components/ui/animate-in";
import { getArticles, formatLongDate } from "@/lib/content";

export const metadata: Metadata = {
  title: "Nos articles | Horkos Wealth Management",
  description:
    "Nos points de vue sur l'actualité patrimoniale, fiscale et réglementaire au Maroc.",
};

export const revalidate = 300;

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <>
      <PageHero
        tag="Nos articles"
        title="Décrypter la gestion de patrimoine, sans jargon."
        subtitle="Nos points de vue sur l'actualité patrimoniale, fiscale et réglementaire au Maroc."
      />

      <section className="py-14">
        <div className="max-w-[1200px] mx-auto px-7">
          {articles.length === 0 ? (
            <EmptyState
              title="Nos premiers articles arrivent"
              desc="Nous préparons nos analyses sur la structuration, la fiscalité et la transmission au Maroc."
            />
          ) : (
            <div>
              {articles.map((article, i) => (
                <AnimateIn key={article.id} variant="fade-up" mobileVariant="fade-left" delay={i * 80}>
                  <Link
                    href={`/ressources/articles/${article.slug}`}
                    className="group grid grid-cols-1 md:grid-cols-[190px_1fr] gap-x-8 gap-y-2 py-7 border-t border-cream-deep last:border-b transition-colors hover:bg-cream/70 -mx-4 px-4 rounded-lg"
                  >
                    <div>
                      <div className="text-[12.5px] text-warm-grey">
                        {formatLongDate(article.published_at ?? article.created_at)}
                      </div>
                      {article.category && (
                        <div className="text-bronze-dark text-[11px] font-semibold tracking-[1.4px] uppercase mt-1">
                          {article.category}
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="font-heading text-[20.5px] font-semibold text-ink leading-[1.35] group-hover:text-bronze-dark transition-colors">
                        {article.title}
                      </h2>
                      {article.excerpt && (
                        <p className="text-[13.5px] text-warm-grey leading-[1.6] mt-1.5 max-w-[680px]">
                          {article.excerpt}
                        </p>
                      )}
                      <span className="inline-block text-bronze text-[12.5px] font-medium mt-3 transition-transform duration-300 group-hover:translate-x-1">
                        Lire l&apos;article →
                      </span>
                    </div>
                  </Link>
                </AnimateIn>
              ))}
            </div>
          )}
        </div>
      </section>

      <CtaBand title="Une question après lecture ?" label="Prendre rendez-vous" />
    </>
  );
}
