import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { formatDateLong } from "@/lib/dates";
import { ArticleCreate } from "./article-create";
import { setArticlePublished, deleteArticle } from "./actions";
import { param, pick, sensDe, recherche, trier, instant, contient, LIMITE_LISTE } from "@/lib/liste";

export const metadata: Metadata = { title: "Articles" };

/** Colonnes triables. Le défaut ouvre sur les derniers écrits. */
const TRIS = ["titre", "statut", "date"] as const;
const ETATS = [
  { value: "publies", label: "Publiés" },
  { value: "brouillons", label: "Brouillons" },
];

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "date")!;
  const sens = sensDe(param(raw, "sens"), tri === "date" ? "desc" : "asc");
  const etat = pick(param(raw, "etat"), ["publies", "brouillons"] as const, null);
  const q = recherche(raw);

  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, category, is_published, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMITE_LISTE);

  // Filtré et trié en mémoire : la liste est bornée par la requête, et un tri
  // délégué à Postgres obligerait à réassigner le constructeur de requête - ce
  // que ce projet évite (voir `lib/liste`).
  const rows = trier(
    (data ?? []).filter(
      (a) =>
        (etat === null || (etat === "publies") === Boolean(a.is_published)) &&
        contient([a.title, a.category, a.slug], q)
    ),
    (a) =>
      tri === "titre"
        ? a.title
        : tri === "statut"
          ? Boolean(a.is_published)
          : instant(a.published_at ?? a.created_at),
    sens,
    (a) => a.title
  );

  const params = { etat: etat ?? undefined, q: q || undefined };

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

      <AnimateIn variant="fade-up" delay={40}>
        <FiltresListe
          champs={[{ cle: "etat", aria: "État", toutes: "Tous les états", options: ETATS }]}
          recherche={{ placeholder: "Rechercher un titre…" }}
          total={rows.length}
          unite="article"
        />
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            <TriHeader key="t" label="Titre" colonne="titre" tri={tri} sens={sens} params={params} />,
            <TriHeader key="s" label="Statut" colonne="statut" tri={tri} sens={sens} params={params} />,
            <TriHeader
              key="d"
              label="Date"
              colonne="date"
              tri={tri}
              sens={sens}
              params={params}
              sensInitial="desc"
            />,
            "",
          ]}
          isEmpty={rows.length === 0}
          empty={
            q || etat
              ? "Aucun article ne correspond à ces critères."
              : "Aucun article pour l'instant. Créez le premier avec « Nouvel article »."
          }
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
