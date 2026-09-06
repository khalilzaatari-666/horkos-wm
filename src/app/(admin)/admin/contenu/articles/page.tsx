import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { formatDateLong } from "@/lib/dates";
import { ArticleCreate } from "./article-create";
import { setArticlePublished, deleteArticle } from "./actions";

export const metadata: Metadata = { title: "Articles" };

export default async function AdminArticlesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, category, is_published, published_at, created_at")
    .order("created_at", { ascending: false });

  const rows = data ?? [];

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <AdminHead
          title="Articles"
          desc="Les articles publiés alimentent la page Ressources du site. Un brouillon reste invisible tant qu'il n'est pas publié."
        />
        <AnimateIn variant="fade-up">
          <ArticleCreate />
        </AnimateIn>
      </div>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Titre", "Statut", "Date", ""]}
          isEmpty={rows.length === 0}
          empty="Aucun article pour l'instant. Créez le premier avec « Nouvel article »."
        >
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-cream/40 transition-colors align-top">
              <Td>
                <Link
                  href={`/admin/contenu/articles/${a.id}`}
                  className="font-medium text-ink hover:text-bronze-dark transition-colors"
                >
                  {a.title}
                </Link>
                <div className="text-[11.5px] text-warm-grey mt-0.5">
                  {a.category ? `${a.category} · ` : ""}
                  <span className="font-mono">/{a.slug}</span>
                </div>
              </Td>
              <Td>
                <AdminBadge tone={a.is_published ? "succes" : "neutre"}>
                  {a.is_published ? "Publié" : "Brouillon"}
                </AdminBadge>
              </Td>
              <Td className="whitespace-nowrap text-warm-grey">
                {formatDateLong(a.published_at ?? a.created_at)}
              </Td>
              <Td>
                <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                  <Link
                    href={`/admin/contenu/articles/${a.id}`}
                    className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium transition-colors"
                  >
                    Modifier
                  </Link>
                  <form action={setArticlePublished}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="publish" value={a.is_published ? "false" : "true"} />
                    <button
                      type="submit"
                      className="text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
                    >
                      {a.is_published ? "Dépublier" : "Publier"}
                    </button>
                  </form>
                  <form action={deleteArticle}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmButton
                      message={`Supprimer définitivement l'article « ${a.title} » ?`}
                      className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Supprimer
                    </ConfirmButton>
                  </form>
                </div>
              </Td>
            </tr>
          ))}
        </AdminTable>
      </AnimateIn>
    </>
  );
}
