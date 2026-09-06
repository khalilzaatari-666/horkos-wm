import { redirect } from "next/navigation";

/**
 * La section n'a pas de page à elle : elle ouvre sur son premier onglet.
 * C'est ce qui permet à la barre latérale de pointer sur `/admin/contenu` et de
 * rester allumée sur les quatre onglets.
 */
export default function ContenuIndexPage() {
  redirect("/admin/contenu/articles");
}
