import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { FaqCreate } from "./faq-create";
import { setFaqPublished, deleteFaq } from "./actions";
import { param, pick, sensDe, recherche, trier, contient, LIMITE_LISTE } from "@/lib/liste";

export const metadata: Metadata = { title: "FAQ" };

/** L'ordre par défaut est celui de la page d'accueil : c'est le sujet du tableau. */
const TRIS = ["ordre", "question", "statut"] as const;
const ETATS = [
  { value: "publies", label: "Publiées" },
  { value: "brouillons", label: "Brouillons" },
];

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "ordre")!;
  const sens = sensDe(param(raw, "sens"));
  const etat = pick(param(raw, "etat"), ["publies", "brouillons"] as const, null);
  const q = recherche(raw);

  const supabase = await createClient();
  // Le même tri que la page d'accueil : ce que le tableau montre est l'ordre
  // dans lequel le visiteur les lira.
  const { data } = await supabase
    .from("faqs")
    .select("id, question, answer, sort_order, is_published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(LIMITE_LISTE);

  const toutes = data ?? [];
  const publiees = toutes.filter((f) => f.is_published).length;

  const rows = trier(
    toutes.filter(
      (f) =>
        (etat === null || (etat === "publies") === Boolean(f.is_published)) &&
        contient([f.question, f.answer], q)
    ),
    (f) =>
      tri === "question"
        ? f.question
        : tri === "statut"
          ? Boolean(f.is_published)
          : (f.sort_order ?? 0),
    sens,
    (f) => f.question
  );

  const params = { etat: etat ?? undefined, q: q || undefined };

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <AdminHead
          title="FAQ"
          desc="Les questions publiées composent la section « Vos questions, nos réponses » de la page d'accueil, dans l'ordre indiqué."
        />
        <AnimateIn variant="fade-up">
          <FaqCreate />
        </AnimateIn>
      </div>

      {toutes.length > 0 && publiees === 0 && (
        <p className="text-[12.5px] text-warm-grey -mt-2 mb-4">
          Aucune question n&apos;est publiée : la page d&apos;accueil affiche pour l&apos;instant sa
          liste de secours.
        </p>
      )}

      <AnimateIn variant="fade-up" delay={40}>
        <FiltresListe
          champs={[{ cle: "etat", aria: "État", toutes: "Tous les états", options: ETATS }]}
          recherche={{ placeholder: "Rechercher une question…" }}
          total={rows.length}
          unite="question"
        />
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            <TriHeader key="o" label="Ordre" colonne="ordre" tri={tri} sens={sens} params={params} />,
            <TriHeader
              key="q"
              label="Question"
              colonne="question"
              tri={tri}
              sens={sens}
              params={params}
            />,
            <TriHeader key="s" label="Statut" colonne="statut" tri={tri} sens={sens} params={params} />,
            "",
          ]}
          isEmpty={rows.length === 0}
          empty={
            q || etat
              ? "Aucune question ne correspond à ces critères."
              : "Aucune question. Tant que cette liste est vide, la page d'accueil affiche sa liste de secours."
          }
        >
          {rows.map((f) => (
            <tr key={f.id} className="hover:bg-cream/40 transition-colors align-top">
              <Td className="whitespace-nowrap tabular-nums text-warm-grey">{f.sort_order}</Td>
              <Td>
                <Link
                  href={`/admin/contenu/faqs/${f.id}`}
                  className="font-medium text-ink hover:text-bronze-dark transition-colors"
                >
                  {f.question}
                </Link>
                <p className="text-[12px] text-warm-grey leading-[1.5] mt-1 max-w-[560px] line-clamp-2">
                  {f.answer}
                </p>
              </Td>
              <Td>
                <AdminBadge tone={f.is_published ? "succes" : "neutre"}>
                  {f.is_published ? "Publiée" : "Brouillon"}
                </AdminBadge>
              </Td>
              <Td>
                <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                  <Link
                    href={`/admin/contenu/faqs/${f.id}`}
                    className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium transition-colors"
                  >
                    Modifier
                  </Link>
                  <form action={setFaqPublished}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="publish" value={f.is_published ? "false" : "true"} />
                    <button
                      type="submit"
                      className="text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
                    >
                      {f.is_published ? "Dépublier" : "Publier"}
                    </button>
                  </form>
                  <form action={deleteFaq}>
                    <input type="hidden" name="id" value={f.id} />
                    <ConfirmButton
                      message={`Supprimer définitivement la question « ${f.question} » ?`}
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
