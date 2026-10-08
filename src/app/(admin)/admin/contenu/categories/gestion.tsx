import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { CategorieForm } from "./categorie-form";
import { supprimerCategorie } from "./actions";

type Categorie = { name: string; sort_order: number };

const PAGES = {
  articles: { table: "article_categories", unite: "article" },
  guides: { table: "guide_categories", unite: "guide" },
} as const;

/**
 * La liste des catégories d'une page, gérée en haut de cette page : ajouter,
 * renommer, réordonner, supprimer. Repliée par défaut, la liste des contenus
 * reste le sujet de l'écran.
 */
export async function GestionCategories({ type }: { type: "articles" | "guides" }) {
  const { table, unite } = PAGES[type];
  const supabase = await createClient();
  const [{ data }, { data: contenus }] = await Promise.all([
    supabase
      .from(table)
      .select("name, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from(type).select("category").not("category", "is", null),
  ]);
  const categories = (data ?? []) as Categorie[];

  return (
    <details className="group max-w-[760px] mb-6 border border-ink/10 rounded-lg bg-white">
      <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none text-[13.5px] font-medium text-ink">
        <span>
          Catégories{" "}
          <span className="text-warm-grey font-normal tabular-nums">({categories.length})</span>
        </span>
        <span className="text-ink transition-transform duration-200 group-open:rotate-90">▸</span>
      </summary>

      <div className="px-4 pb-4">
        <p className="text-[12.5px] text-warm-grey leading-[1.6] mb-3">
          Elles servent de filtres sur le site, dans l&apos;ordre indiqué (les plus petits nombres
          d&apos;abord). La catégorie d&apos;un {unite} se choisit dans son formulaire.
        </p>
        <CategorieForm type={type} />

        {categories.length > 0 && (
          <ul className="mt-4 border-t border-ink/10">
            {categories.map((c) => {
              const nb = (contenus ?? []).filter((r) => r.category === c.name).length;
              return (
                <li key={c.name} className="py-3 border-b border-ink/10 last:border-b-0">
                  <div className="flex flex-wrap items-start gap-3">
                    {/* La clé suit les valeurs : après un enregistrement, le
                        formulaire repart de ce que la base a retenu. */}
                    <CategorieForm key={`${c.name}-${c.sort_order}`} type={type} initial={c} />
                    <form action={supprimerCategorie} className="h-10 flex items-center">
                      <input type="hidden" name="type" value={type} />
                      <input type="hidden" name="name" value={c.name} />
                      <ConfirmButton
                        message={`Supprimer la catégorie « ${c.name} » ? Ses ${unite}s resteront en ligne, sans catégorie.`}
                        className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
                      >
                        Supprimer
                      </ConfirmButton>
                    </form>
                  </div>
                  <p className="text-[11.5px] text-warm-grey mt-1 tabular-nums">
                    {nb} {unite}
                    {nb > 1 ? "s" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </details>
  );
}
