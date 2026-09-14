import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import {
  AdminPanel,
  AdminHead,
  AdminCard,
  AdminTable,
  Td,
  AdminBadge,
} from "@/components/admin/ui";
import { formatDateLong } from "@/lib/dates";
import { parseDetails } from "@/lib/recommandation-details";
import { grouperParCategorie } from "@/lib/recommandation-categories";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { param, pick, sensDe, recherche, trier, instant, contient, LIMITE_LISTE } from "@/lib/liste";
import { RecommendationCreate } from "./recommendation-create";
import { RecommendationRowActions } from "./recommendation-row-actions";

export const metadata: Metadata = { title: "Recommandations" };

/** Le tri joue à l'intérieur d'une catégorie : les sections, elles, restent
 *  alphabétiques - c'est le classement du coffre-fort, pas un réglage. */
const TRIS = ["titre", "statut", "creee"] as const;
const ETATS = [
  { value: "actives", label: "Actives" },
  { value: "inactives", label: "Inactives" },
];

export default async function RecommandationsCataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "titre")!;
  const sens = sensDe(param(raw, "sens"), tri === "creee" ? "desc" : "asc");
  const etat = pick(param(raw, "etat"), ["actives", "inactives"] as const, null);
  const categorie = param(raw, "categorie") ?? null;
  const q = recherche(raw);

  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("id, title, category, description, details, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMITE_LISTE);

  const toutes = data ?? [];

  // Les catégories proposées au filtre viennent du catalogue entier, jamais de
  // la vue courante : une liste de choix qui rétrécit à chaque clic empêche de
  // passer d'une catégorie à l'autre.
  const categories = grouperParCategorie(toutes, (r) => r.category).map((g) => g.categorie);

  const rows = trier(
    toutes.filter(
      (r) =>
        (etat === null || (etat === "actives") === Boolean(r.is_active)) &&
        (categorie === null || (r.category ?? "").trim() === categorie) &&
        contient([r.title, r.category, r.description], q)
    ),
    (r) =>
      tri === "statut" ? Boolean(r.is_active) : tri === "creee" ? instant(r.created_at) : r.title,
    sens,
    (r) => r.title
  );

  // Une section par catégorie, comme le coffre-fort : le catalogue se parcourt
  // par thème, et la colonne « Catégorie » devient alors du bruit répété.
  const groupes = grouperParCategorie(rows, (r) => r.category);

  const params = {
    etat: etat ?? undefined,
    categorie: categorie ?? undefined,
    q: q || undefined,
  };

  return (
    <AdminPanel>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <AdminHead
          title="Recommandations"
          desc="Le catalogue des recommandations proposables. Une recommandation active peut être attribuée à un client depuis son dossier."
        />
        <AnimateIn variant="fade-up">
          <RecommendationCreate />
        </AnimateIn>
      </div>

      <AnimateIn variant="fade-up" delay={40}>
        <FiltresListe
          champs={[
            {
              cle: "categorie",
              aria: "Catégorie",
              toutes: "Toutes les catégories",
              options: categories.map((c) => ({ value: c, label: c })),
            },
            { cle: "etat", aria: "État", toutes: "Tous les états", options: ETATS },
          ]}
          recherche={{ placeholder: "Rechercher une recommandation…" }}
          total={rows.length}
          unite="recommandation"
        />
      </AnimateIn>

      {rows.length === 0 ? (
        <AnimateIn variant="fade-up" delay={60}>
          <AdminCard className="p-10 text-center">
            <p className="text-[13.5px] text-warm-grey leading-[1.65] max-w-[440px] mx-auto">
              {q || etat || categorie
                ? "Aucune recommandation ne correspond à ces critères."
                : "Aucune recommandation. Créez la première avec « Nouvelle recommandation »."}
            </p>
          </AdminCard>
        </AnimateIn>
      ) : (
        <div className="space-y-7">
          {groupes.map((groupe, gi) => (
            <section key={groupe.categorie}>
              <AnimateIn variant="fade-up" delay={60 + gi * 50}>
                <h2 className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase mb-3">
                  {groupe.categorie}
                </h2>
                <AdminTable
                  headers={[
                    <TriHeader
                      key="titre"
                      label="Titre"
                      colonne="titre"
                      tri={tri}
                      sens={sens}
                      params={params}
                    />,
                    // L'étiquette porte son propre `px-2.5` : sans ce décalage,
                    // « Active » commence dix pixels à droite de « Statut ».
                    <span key="statut" className="pl-2.5">
                      <TriHeader
                        label="Statut"
                        colonne="statut"
                        tri={tri}
                        sens={sens}
                        params={params}
                      />
                    </span>,
                    <TriHeader
                      key="creee"
                      label="Créée le"
                      colonne="creee"
                      tri={tri}
                      sens={sens}
                      params={params}
                      sensInitial="desc"
                    />,
                    "",
                  ]}
                  isEmpty={false}
                  empty=""
                >
                  {groupe.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-cream/40 transition-colors align-top">
                      {/* Le titre absorbe la largeur restante, le statut est
                          fixe : sans cela chaque section, qui est un tableau à
                          part, calerait sa colonne Statut sur la longueur de ses
                          propres titres et les sections ne s'aligneraient plus
                          entre elles. */}
                      <Td className="w-full text-ink font-medium">{r.title}</Td>
                      <Td className="w-[140px]">
                        <AdminBadge tone={r.is_active ? "succes" : "neutre"}>
                          {r.is_active ? "Active" : "Inactive"}
                        </AdminBadge>
                      </Td>
                      <Td className="w-px whitespace-nowrap text-warm-grey">
                        {formatDateLong(r.created_at)}
                      </Td>
                      <Td className="w-px whitespace-nowrap">
                        <RecommendationRowActions
                          reco={{
                            id: r.id,
                            title: r.title,
                            category: r.category,
                            description: r.description ?? "",
                            is_active: r.is_active ?? false,
                            details: parseDetails(r.details),
                          }}
                        />
                      </Td>
                    </tr>
                  ))}
                </AdminTable>
              </AnimateIn>
            </section>
          ))}
        </div>
      )}
    </AdminPanel>
  );
}
