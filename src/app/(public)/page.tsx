import type { Metadata } from "next";
import { HomeContent, type FaqPublique, type Publication } from "./home-content";
import { getArticles, getFaqs, getGuides } from "@/lib/content";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// The page itself is a client component (GSAP), which cannot export metadata,
// and the homepage shares its layout with every other public page. Hence this
// thin server wrapper.
export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} | Conseil en gestion de patrimoine au Maroc`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

/**
 * Même cadence que les pages Ressources, et pour la même raison : la FAQ et les
 * publications viennent de la base via le client sans cookie, ce qui laisse la
 * page préproduite plutôt que recalculée à chaque visite. Une modification
 * depuis le back-office l'invalide sans attendre ce délai (`revalidatePath("/")`).
 */
export const revalidate = 300;

export default async function HomePage() {
  const [faqRows, articles, guides] = await Promise.all([getFaqs(), getArticles(), getGuides()]);
  const faqs: FaqPublique[] = faqRows.map((f) => ({ q: f.question, a: f.answer }));

  // Les dernières publications, articles puis guides, pour le rail Ressources.
  const publications: Publication[] = [
    ...articles.slice(0, 4).map((a) => ({
      kind: "Article" as const,
      title: a.title,
      desc: a.excerpt,
      href: `/ressources/articles/${a.slug}`,
      cover: a.cover_url,
      category: a.category,
    })),
    ...guides.slice(0, 3).map((g) => ({
      kind: "Guide" as const,
      title: g.title,
      desc: g.description,
      href: "/ressources/guides",
      cover: g.cover_url,
      category: g.category,
    })),
  ];

  // Liste vide - table encore vierge, ou lecture en échec : `HomeContent`
  // retombe alors sur sa propre liste plutôt que d'afficher une section creuse.
  return <HomeContent faqs={faqs.length ? faqs : undefined} publications={publications} />;
}
