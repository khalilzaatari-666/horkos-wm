import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getArticles } from "@/lib/content";

// Rebuilt on the same cadence as the ressources pages, so a freshly published
// article appears without a redeployment.
export const revalidate = 300;

const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "monthly" },
  { path: "/cabinet/approche", priority: 0.8, changeFrequency: "yearly" },
  { path: "/cabinet/modele", priority: 0.8, changeFrequency: "yearly" },
  { path: "/cabinet/produits", priority: 0.8, changeFrequency: "monthly" },
  { path: "/conseil/structuration", priority: 0.8, changeFrequency: "yearly" },
  { path: "/conseil/reseau", priority: 0.7, changeFrequency: "yearly" },
  { path: "/conseil/cas-usage", priority: 0.7, changeFrequency: "yearly" },
  { path: "/ressources/articles", priority: 0.7, changeFrequency: "weekly" },
  { path: "/ressources/guides", priority: 0.7, changeFrequency: "monthly" },
  { path: "/ressources/evenements", priority: 0.6, changeFrequency: "weekly" },
  { path: "/rendez-vous", priority: 0.9, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const pages: MetadataRoute.Sitemap = staticRoutes.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const articles = await getArticles();
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/ressources/articles/${article.slug}`,
    lastModified: new Date(article.published_at ?? article.created_at),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...pages, ...articlePages];
}
