import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminTable, Td } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { formatDateTime } from "@/lib/dates";
import { GuideForm, type GuideInitial } from "../guide-form";
import { updateGuide } from "../actions";
import { param, pick, sensDe, recherche, trier, instant, contient } from "@/lib/liste";

export const metadata: Metadata = { title: "Guide" };

/** Au-delà, la page deviendrait un export déguisé plutôt qu'un historique. */
const MAX_DEMANDES = 200;

const TRIS = ["adresse", "demande"] as const;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GuideEditPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "demande")!;
  const sens = sensDe(param(raw, "sens"), tri === "demande" ? "desc" : "asc");
  const q = recherche(raw);

  const supabase = await createClient();

  // Le guide et son historique en un aller-retour : la liste des demandes n'a
  // de sens qu'à côté du guide qu'elle concerne.
  const [{ data: guide }, { data: demandes, count }] = await Promise.all([
    supabase
      .from("guides")
      .select("id, title, slug, description, partner, cover_label, cover_url, pdf_url, is_published")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("guide_downloads")
      .select("id, email, sent_at", { count: "exact" })
      .eq("guide_id", id)
      .order("sent_at", { ascending: false })
      .limit(MAX_DEMANDES),
  ]);

  if (!guide) notFound();

  const initial: GuideInitial = {
    id: guide.id,
    title: guide.title ?? "",
    slug: guide.slug ?? "",
    description: guide.description ?? "",
    partner: guide.partner ?? "",
    cover_label: guide.cover_label ?? "",
    cover_url: guide.cover_url ?? "",
    pdf_url: guide.pdf_url ?? "",
    is_published: guide.is_published ?? false,
  };

  const toutes = demandes ?? [];
  const total = count ?? toutes.length;

  const lignes = trier(
    toutes.filter((d) => contient([d.email], q)),
    (d) => (tri === "adresse" ? d.email : instant(d.sent_at)),
    sens,
    (d) => d.email
  );
  // Une même adresse peut redemander le guide : le nombre de personnes n'est pas
  // le nombre de demandes, et confondre les deux gonflerait le chiffre.
  const adresses = new Set(toutes.map((d) => d.email.trim().toLowerCase())).size;

  return (
    <>
      <AdminHead
        title="Modifier le guide"
        desc="Les changements sont visibles dès l'enregistrement."
      />
      <GuideForm action={updateGuide} initial={initial} />

      <section className="mt-10">
        <h2 className="font-heading text-[17.5px] font-semibold text-ink">Demandes reçues</h2>
        <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[620px] mt-1 mb-4 tabular-nums">
          {total > 0
            ? `${total} demande${total > 1 ? "s" : ""} depuis la page Ressources, ${adresses} adresse${
                adresses > 1 ? "s" : ""
              } distincte${adresses > 1 ? "s" : ""}.`
            : "Les adresses qui demandent ce guide depuis la page Ressources apparaîtront ici."}
        </p>

        {toutes.length > 0 && (
          <AnimateIn variant="fade-up" delay={40}>
            <FiltresListe
              recherche={{ placeholder: "Rechercher une adresse…" }}
              total={lignes.length}
              unite="demande"
            />
          </AnimateIn>
        )}

        <AnimateIn variant="fade-up" delay={60}>
          <AdminTable
            headers={[
              <TriHeader
                key="a"
                label="Adresse"
                colonne="adresse"
                tri={tri}
                sens={sens}
                params={{ q: q || undefined }}
              />,
              <TriHeader
                key="d"
                label="Demandé le"
                colonne="demande"
                tri={tri}
                sens={sens}
                params={{ q: q || undefined }}
                sensInitial="desc"
              />,
            ]}
            isEmpty={lignes.length === 0}
            empty="Aucune demande pour ce guide."
          >
            {lignes.map((d) => (
              <tr key={d.id} className="hover:bg-cream/40 transition-colors">
                <Td>
                  <a
                    href={`mailto:${d.email}`}
                    className="text-bronze-dark hover:text-bronze transition-colors"
                  >
                    {d.email}
                  </a>
                </Td>
                <Td className="whitespace-nowrap text-warm-grey">{formatDateTime(d.sent_at)}</Td>
              </tr>
            ))}
          </AdminTable>
        </AnimateIn>

        {total > lignes.length && (
          <p className="text-[12px] text-warm-grey mt-3 tabular-nums">
            Les {MAX_DEMANDES} plus récentes sont affichées, sur {total}.
          </p>
        )}
      </section>
    </>
  );
}
