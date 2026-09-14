import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { formatDateLong } from "@/lib/dates";
import { GuideCreate } from "./guide-create";
import { setGuidePublished, deleteGuide } from "./actions";
import { param, pick, sensDe, recherche, trier, instant, contient } from "@/lib/liste";

export const metadata: Metadata = { title: "Guides" };

const TRIS = ["titre", "pdf", "statut", "date"] as const;
const ETATS = [
  { value: "publies", label: "Publiés" },
  { value: "brouillons", label: "Brouillons" },
];
/** Un guide publié sans PDF est une promesse qu'on ne peut pas tenir : ce filtre
 *  sert à les retrouver d'un coup. */
const PDFS = [
  { value: "avec", label: "Avec PDF" },
  { value: "sans", label: "PDF manquant" },
];

export default async function AdminGuidesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "date")!;
  const sens = sensDe(param(raw, "sens"), tri === "date" ? "desc" : "asc");
  const etat = pick(param(raw, "etat"), ["publies", "brouillons"] as const, null);
  const pdf = pick(param(raw, "pdf"), ["avec", "sans"] as const, null);
  const q = recherche(raw);

  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select("id, title, slug, partner, pdf_url, is_published, created_at")
    .order("created_at", { ascending: false });

  const rows = trier(
    (data ?? []).filter(
      (g) =>
        (etat === null || (etat === "publies") === Boolean(g.is_published)) &&
        (pdf === null || (pdf === "avec") === Boolean(g.pdf_url)) &&
        contient([g.title, g.partner, g.slug], q)
    ),
    (g) =>
      tri === "titre"
        ? g.title
        : tri === "pdf"
          ? Boolean(g.pdf_url)
          : tri === "statut"
            ? Boolean(g.is_published)
            : instant(g.created_at),
    sens,
    (g) => g.title
  );

  const params = { etat: etat ?? undefined, pdf: pdf ?? undefined, q: q || undefined };

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <AdminHead
          title="Guides"
          desc="Les guides téléchargeables proposés sur la page Ressources. Le PDF est le fichier envoyé aux personnes qui le demandent."
        />
        <AnimateIn variant="fade-up">
          <GuideCreate />
        </AnimateIn>
      </div>

      <AnimateIn variant="fade-up" delay={40}>
        <FiltresListe
          champs={[
            { cle: "etat", aria: "État", toutes: "Tous les états", options: ETATS },
            { cle: "pdf", aria: "Fichier PDF", toutes: "Avec ou sans PDF", options: PDFS },
          ]}
          recherche={{ placeholder: "Rechercher un guide…" }}
          total={rows.length}
          unite="guide"
        />
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            <TriHeader key="t" label="Titre" colonne="titre" tri={tri} sens={sens} params={params} />,
            <TriHeader key="p" label="PDF" colonne="pdf" tri={tri} sens={sens} params={params} />,
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
            q || etat || pdf
              ? "Aucun guide ne correspond à ces critères."
              : "Aucun guide pour l'instant. Créez le premier avec « Nouveau guide »."
          }
        >
          {rows.map((g) => (
            <tr key={g.id} className="hover:bg-cream/40 transition-colors align-top">
              <Td>
                <Link
                  href={`/admin/contenu/guides/${g.id}`}
                  className="font-medium text-ink hover:text-bronze-dark transition-colors"
                >
                  {g.title}
                </Link>
                <div className="text-[11.5px] text-warm-grey mt-0.5">
                  {g.partner ? `${g.partner} · ` : ""}
                  <span className="font-mono">/{g.slug}</span>
                </div>
              </Td>
              <Td>
                {g.pdf_url ? (
                  <AdminBadge tone="succes">Oui</AdminBadge>
                ) : (
                  <AdminBadge tone="attente">Manquant</AdminBadge>
                )}
              </Td>
              <Td>
                <AdminBadge tone={g.is_published ? "succes" : "neutre"}>
                  {g.is_published ? "Publié" : "Brouillon"}
                </AdminBadge>
              </Td>
              <Td className="whitespace-nowrap text-warm-grey">{formatDateLong(g.created_at)}</Td>
              <Td>
                <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                  <Link
                    href={`/admin/contenu/guides/${g.id}`}
                    className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium transition-colors"
                  >
                    Modifier
                  </Link>
                  <form action={setGuidePublished}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="publish" value={g.is_published ? "false" : "true"} />
                    <button
                      type="submit"
                      className="text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
                    >
                      {g.is_published ? "Dépublier" : "Publier"}
                    </button>
                  </form>
                  <form action={deleteGuide}>
                    <input type="hidden" name="id" value={g.id} />
                    <ConfirmButton
                      message={`Supprimer définitivement le guide « ${g.title} » ?`}
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
