import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel, AdminHead } from "@/components/admin/ui";
import { ArticleForm, type ArticleInitial } from "../article-form";
import { createArticle, updateArticle } from "../actions";

export const metadata: Metadata = { title: "Article" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticleEditPage({ params }: PageProps) {
  const { id } = await params;
  const isNew = id === "new";

  if (isNew) {
    return (
      <AdminPanel>
        <AdminHead title="Nouvel article" desc="Rédigez, puis publiez quand vous êtes prêt." />
        <ArticleForm action={createArticle} />
      </AdminPanel>
    );
  }

  const supabase = await createClient();
  const { data: article } = await supabase
    .from("articles")
    .select("id, title, slug, category, excerpt, content, cover_url, is_published")
    .eq("id", id)
    .maybeSingle();

  if (!article) notFound();

  const initial: ArticleInitial = {
    id: article.id,
    title: article.title ?? "",
    slug: article.slug ?? "",
    category: article.category ?? "",
    excerpt: article.excerpt ?? "",
    content: article.content ?? "",
    cover_url: article.cover_url ?? "",
    is_published: article.is_published ?? false,
  };

  return (
    <AdminPanel>
      <AdminHead title="Modifier l'article" desc="Les changements sont visibles dès l'enregistrement." />
      <ArticleForm action={updateArticle} initial={initial} />
    </AdminPanel>
  );
}
