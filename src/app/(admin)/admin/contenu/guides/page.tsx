import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { formatDateLong } from "@/lib/dates";
import { setGuidePublished, deleteGuide } from "./actions";

export const metadata: Metadata = { title: "Guides" };

export default async function AdminGuidesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select("id, title, slug, partner, pdf_url, is_published, created_at")
    .order("created_at", { ascending: false });

  const rows = data ?? [];

  return (
    <AdminPanel>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <AdminHead
          title="Guides"
          desc="Les guides téléchargeables proposés sur la page Ressources. Le PDF est le fichier envoyé aux personnes qui le demandent."
        />
        <AnimateIn variant="fade-up">
          <Link
            href="/admin/contenu/guides/new"
            className="h-10 px-5 inline-flex items-center text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors"
          >
            Nouveau guide
          </Link>
        </AnimateIn>
      </div>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Titre", "PDF", "Statut", "Date", ""]}
          isEmpty={rows.length === 0}
          empty="Aucun guide pour l'instant. Créez le premier avec « Nouveau guide »."
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
    </AdminPanel>
  );
}
