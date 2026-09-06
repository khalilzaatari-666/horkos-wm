import { AdminPanel } from "@/components/admin/ui";
import { ContenuTabs } from "@/components/admin/contenu-tabs";

/**
 * Articles, guides, événements et FAQ sont le même geste : écrire ce que le site
 * public affichera. Une seule section à onglets plutôt que quatre entrées de
 * menu, et c'est ici que vit le cadre commun - les pages filles n'ont plus à
 * porter leur propre `AdminPanel`.
 *
 * Les onglets restent visibles sur les pages d'édition : depuis un article, on
 * saute à la FAQ sans repasser par le menu.
 */
export default function ContenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPanel>
      <ContenuTabs />
      {children}
    </AdminPanel>
  );
}
